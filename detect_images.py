import os
import sys
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import cv2

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from hybrid_detector import HybridDetector

def process_single_image(img_path, detector, output_dir):
    """Function to process a single image, used by the ThreadPool"""
    try:
        frame = cv2.imread(str(img_path))
        if frame is None:
            print(f"[ERROR] Could not read {img_path.name}")
            return False, 0
            
        detections = detector.detect(frame)
        annotated = detector.draw(frame, detections)
        
        # Save output
        out_path = output_dir / f"detected_{img_path.name}"
        cv2.imwrite(str(out_path), annotated)
        
        return True, len(detections)
        
    except Exception as e:
        print(f"[ERROR] Failed processing {img_path.name}: {e}")
        return False, 0

def run_batch_detection(input_folder, output_folder, yolo_conf=0.15):
    """Detects cracks on multiple images in a folder simultaneously."""
    
    in_dir = Path(input_folder)
    out_dir = Path(output_folder)
    
    if not in_dir.exists() or not in_dir.is_dir():
        print(f"ERROR: Input folder not found at {in_dir}")
        sys.exit(1)
        
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Gather image files
    valid_exts = {".jpg", ".jpeg", ".png", ".bmp"}
    img_files = [p for p in in_dir.iterdir() if p.suffix.lower() in valid_exts]
    
    if not img_files:
        print(f"ERROR: No supported images found in {in_dir}")
        sys.exit(1)
        
    print("\n" + "=" * 60)
    print("  RAILWAY CRACK DETECTION — BATCH IMAGE MODE")
    print("=" * 60)
    print(f"  Input folder:  {in_dir}")
    print(f"  Output folder: {out_dir}")
    print(f"  Images found:  {len(img_files)}")
    print("=" * 60 + "\n")
    
    # Initialize detector once
    detector = HybridDetector(yolo_conf=yolo_conf)
    
    print("\n[INFO] Starting batch processing...\n")
    
    success_count = 0
    total_detections = 0
    
    # Use a simple loop. PyTorch models are not thread-safe for concurrent inference
    # on the same model instance, which caused the previous crash.
    processed = 0
    for path in img_files:
        processed += 1
        success, detections_count = process_single_image(path, detector, out_dir)
        
        if success:
            success_count += 1
            total_detections += detections_count
            
            status_char = "!" if detections_count > 0 else "."
            print(status_char, end="", flush=True)
            
        if processed % 50 == 0 or processed == len(img_files):
            print(f" [{processed}/{len(img_files)}]")

    print("\n" + "=" * 60)
    print(f"  BATCH PROCESSING COMPLETE!")
    print(f"  Images processed successfully: {success_count}/{len(img_files)}")
    print(f"  Total crack detections found:  {total_detections}")
    print(f"  Annotated images saved to:     {out_dir}")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run detection on a folder of images.")
    parser.add_argument("--input", type=str, required=True, help="Path to folder containing images")
    parser.add_argument("--output", type=str, default="batch_results", help="Path to save annotated images (default: batch_results)")
    parser.add_argument("--yolo-conf", type=float, default=0.15, help="YOLO confidence threshold (default: 0.15)")
    args = parser.parse_args()
    
    run_batch_detection(args.input, args.output, args.yolo_conf)
