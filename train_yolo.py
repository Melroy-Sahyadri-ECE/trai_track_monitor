"""
Railway Crack Detection — YOLOv8 Training Script
=================================================
Trains a YOLOv8-nano model on the railway-gap dataset.
Uses CUDA acceleration (RTX 4050) for fast training.
"""

import os
import sys
from pathlib import Path

def main():
    try:
        from ultralytics import YOLO
    except ImportError:
        print("ERROR: ultralytics not installed. Run:")
        print("  .\\venv\\Scripts\\pip.exe install ultralytics")
        sys.exit(1)

    # ── Paths ──────────────────────────────────────────────────────────
    ROOT = Path(__file__).resolve().parent
    DATA_YAML = ROOT / "dataset" / "data.yaml"

    if not DATA_YAML.exists():
        print(f"ERROR: data.yaml not found at {DATA_YAML}")
        sys.exit(1)

    # ── Fix data.yaml paths to be absolute ─────────────────────────────
    dataset_dir = ROOT / "dataset"
    yaml_content = f"""train: {dataset_dir / 'train' / 'images'}
val: {dataset_dir / 'valid' / 'images'}
test: {dataset_dir / 'test' / 'images'}

nc: 1
names: ['railway-gap']
"""
    DATA_YAML.write_text(yaml_content)
    print(f"[INFO] Updated data.yaml with absolute paths")
    print(f"[INFO] Dataset directory: {dataset_dir}")

    # ── Model Setup ────────────────────────────────────────────────────
    project_root = Path(__file__).resolve().parent
    data_yaml_path = project_root / 'unified_dataset' / 'data.yaml'
    
    if not data_yaml_path.exists():
        print(f"Error: {data_yaml_path} not found.")
        print("Please ensure the unified dataset is constructed first.")
        sys.exit(1)

    print("="*50)
    print("  Starting YOLOv8 Unified Training (Cracks + Animals)")
    print("="*50)

    # 1. Load the YOLOv8 nano model (lightweight, good for real-time)
    # Using 'yolo26n.pt' or 'yolov8n.pt' - we'll start with the base YOLOv8n weights
    # to leverage transfer learning
    model = YOLO('yolov8n.pt') 

    # 2. Train the model
    # Adjust batch size and epochs based on your specific GPU (RTX 4050 6GB)
    results = model.train(
        data=str(data_yaml_path),
        epochs=100,            # Max epochs
        patience=20,           # Early stopping if no improvement
        batch=8,               # Dropped to 8 to fit safely in 6GB VRAM at 880 imgsz
        imgsz=880,             # Original dataset size
        device=0,              # Use GPU 0
        project='runs',        # Save directory
        name='unified_yolo',   # Run name
        cache=False,           # Disabled cache to prevent PyTorch system RAM MemoryError
        workers=0,             # Must be 0 on Windows to prevent Multiprocessing EOFError
        optimizer='auto',      # Auto-select optimizer (usually AdamW or SGD)
        # Augmentation (crucial for robustness)
        lrf=0.01,
        warmup_epochs=5,
        mosaic=1.0,          # Mosaic augmentation
        flipud=0.5,          # Vertical flip (cracks can appear in any orientation)
        fliplr=0.5,          # Horizontal flip
        hsv_h=0.015,         # Hue augmentation
        hsv_s=0.7,           # Saturation augmentation
        hsv_v=0.4,           # Value augmentation
        translate=0.1,
        scale=0.5,
        verbose=True,
    )

    # ── Results Summary ────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  TRAINING COMPLETE!")
    print("=" * 60)

    best_model = ROOT / "runs" / "railway_crack_yolo" / "weights" / "best.pt"
    if best_model.exists():
        print(f"  Best model saved: {best_model}")
        print(f"  Model size: {best_model.stat().st_size / 1e6:.1f} MB")
    else:
        print("  WARNING: best.pt not found!")

    # ── Validate on test set ───────────────────────────────────────────
    print("\n[INFO] Running validation on test set...")
    model_best = YOLO(str(best_model))
    metrics = model_best.val(
        data=str(DATA_YAML),
        split="test",
        imgsz=640,
        batch=8,
        device=0,
    )

    print(f"\n  Test Results:")
    print(f"    mAP50:     {metrics.box.map50:.4f}")
    print(f"    mAP50-95:  {metrics.box.map:.4f}")
    print(f"    Precision:  {metrics.box.mp:.4f}")
    print(f"    Recall:     {metrics.box.mr:.4f}")

    return best_model


if __name__ == "__main__":
    best = main()
    print(f"\n[DONE] Best model: {best}")
