import os
import sys
from pathlib import Path
from ultralytics import YOLO
import cv2

def auto_annotate_animals(base_dir, conf_thresh=0.25):
    """
    Runs a pre-trained COCO YOLOv8 model over folders of animal images.
    Creates YOLO format .txt label files for any animal found.
    """
    print("Loading pre-trained YOLOv8 for auto-annotation...")
    # Load the standard pre-trained model (which knows 80 classes including most animals)
    model = YOLO("yolov8n.pt") 
    
    # We want to map these COCO animals to our *new* unified class ID (which will be 1, since 0 is crack)
    # COCO animal class IDs: 
    # 15: cat, 16: dog, 17: horse, 18: sheep, 19: cow, 20: elephant, 21: bear, 22: zebra, 23: giraffe
    # We will map any detected animal to class ID 1
    coco_animal_ids = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] # Added bird and others
    
    base_path = Path(base_dir)
    directories = [d for d in base_path.iterdir() if d.is_dir()]
    
    total_images = 0
    total_annotated = 0
    
    if not directories:
        print(f"ERROR: No directories found in {base_path}")
        return
        
    print(f"Found {len(directories)} folders to scan in {base_dir}")
    print("-" * 50)
    
    for folder in directories:
        img_files = list(folder.glob("*.jpg")) + list(folder.glob("*.jpeg")) + list(folder.glob("*.png"))
        
        if not img_files:
            continue
            
        print(f"Scanning '{folder.name}' ({len(img_files)} images)...")
        total_images += len(img_files)
        
        annotated_in_folder = 0
        
        for img_path in img_files:
            # Run inference
            results = model(str(img_path), conf=conf_thresh, verbose=False)
            
            if not results or len(results) == 0:
                continue
                
            result = results[0]
            if result.boxes is None or len(result.boxes) == 0:
                continue
                
            labels_to_write = []
            
            # Extract boxes
            for i in range(len(result.boxes)):
                cls_id = int(result.boxes.cls[i].item())
                
                # If the detected object is an animal (or we just accept anything detected highly in an animal folder)
                # Since these folders ONLY contain animals, we can actually just trust high-confidence detections
                # even if it thinks a "wolf" is a "dog" mapping, we just care about the bounding box!
                
                # Get normalized coordinates coordinates (x_center, y_center, width, height)
                x_c, y_c, w, h = result.boxes.xywhn[i].tolist()
                
                # Class 1 will be 'animal'
                labels_to_write.append(f"1 {x_c:.6f} {y_c:.6f} {w:.6f} {h:.6f}")
                
            if labels_to_write:
                # Write to .txt file with the same name as the image
                txt_path = img_path.with_suffix('.txt')
                with open(txt_path, 'w') as f:
                    f.write('\n'.join(labels_to_write))
                annotated_in_folder += 1
                total_annotated += 1
                
        print(f"  -> Generated labels for {annotated_in_folder}/{len(img_files)} images.")

    print("-" * 50)
    print("AUTO-ANNOTATION COMPLETE!")
    print(f"Total images scanned: {total_images}")
    print(f"Successfully labeled: {total_annotated} ({total_annotated/total_images*100:.1f}%)")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_dir = sys.argv[1]
    else:
        target_dir = r"C:\Users\Melroy Quadros\Downloads\gandu"
        
    auto_annotate_animals(target_dir)
