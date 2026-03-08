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
    # YOLOv8-nano: smallest, fastest — ideal for edge/real-time use
    model = YOLO("yolov8n.pt")

    # ── Training Configuration ─────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  RAILWAY CRACK DETECTION — YOLOv8 TRAINING")
    print("=" * 60)
    print(f"  Model:      YOLOv8-nano")
    print(f"  Dataset:    {DATA_YAML}")
    print(f"  Image size: 640")
    print(f"  Batch:      8")
    print(f"  Epochs:     100 (early stopping @ 20)")
    print("=" * 60 + "\n")

    results = model.train(
        data=str(DATA_YAML),
        epochs=100,
        imgsz=640,           # Good balance of speed and accuracy
        batch=8,             # Fits in 6GB VRAM
        patience=20,         # Early stopping
        save=True,
        save_period=10,      # Checkpoint every 10 epochs
        device=0,            # Use GPU 0
        workers=4,
        project=str(ROOT / "runs"),
        name="railway_crack_yolo",
        exist_ok=True,
        pretrained=True,
        optimizer="AdamW",
        lr0=0.001,
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
