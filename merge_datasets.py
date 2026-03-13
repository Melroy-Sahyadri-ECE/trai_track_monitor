import os
import sys
import shutil
import random
from pathlib import Path

def merge_datasets(crack_dataset_dir, animal_base_dir, output_dir):
    """
    Merges the original crack dataset and the new auto-annotated animal dataset
    into a single unified YOLO YOLOv8 dataset structure.
    """
    crack_path = Path(crack_dataset_dir)
    animal_path = Path(animal_base_dir)
    out_path = Path(output_dir)
    
    # ── Create output structure ──────────────────────────────────────────
    splits = ['train', 'valid', 'test']
    for split in splits:
        (out_path / split / 'images').mkdir(parents=True, exist_ok=True)
        (out_path / split / 'labels').mkdir(parents=True, exist_ok=True)
        
    total_images_copied = 0
    
    # ── 1. Copy Crack Dataset (Class 0) ──────────────────────────────────
    print(f"Copying existing Crack dataset from {crack_path}...")
    for split in splits:
        img_dir = crack_path / split / 'images'
        lbl_dir = crack_path / split / 'labels'
        
        if not img_dir.exists(): continue
            
        for img_file in img_dir.iterdir():
            lbl_file = lbl_dir / (img_file.stem + '.txt')
            
            # Copy image
            shutil.copy2(img_file, out_path / split / 'images' / img_file.name)
            
            # Copy label (already class 0, so no changes needed)
            if lbl_file.exists():
                shutil.copy2(lbl_file, out_path / split / 'labels' / lbl_file.name)
                
            total_images_copied += 1
            
    print(f"  -> Copied {total_images_copied} crack images.")
    
    # ── 2. Collect & Split Animal Dataset (Class 1) ──────────────────────
    print(f"Processing Animal dataset from {animal_path}...")
    animal_dirs = [d for d in animal_path.iterdir() if d.is_dir()]
    
    all_animal_pairs = [] # List of (image_path, label_path)
    
    for folder in animal_dirs:
        # Find all images that have a corresponding .txt label generated
        img_files = list(folder.glob("*.jpg")) + list(folder.glob("*.jpeg")) + list(folder.glob("*.png"))
        
        for img in img_files:
            lbl = img.with_suffix('.txt')
            if lbl.exists():
                all_animal_pairs.append((img, lbl))
                
    print(f"  -> Found {len(all_animal_pairs)} animal images with bounding boxes.")
    
    # Shuffle and split animals (70% train, 20% valid, 10% test)
    random.shuffle(all_animal_pairs)
    n = len(all_animal_pairs)
    train_end = int(n * 0.7)
    valid_end = int(n * 0.9)
    
    splits_dict = {
        'train': all_animal_pairs[:train_end],
        'valid': all_animal_pairs[train_end:valid_end],
        'test': all_animal_pairs[valid_end:]
    }
    
    # ── 3. Copy Animal Dataset ───────────────────────────────────────────
    for split_name, pairs in splits_dict.items():
        print(f"  -> Copying {len(pairs)} animals to {split_name} split...")
        for img_path, lbl_path in pairs:
            # Create a unique name to avoid collisions
            unique_name = f"{img_path.parent.name}_{img_path.name}"
            unique_lbl_name = f"{img_path.parent.name}_{lbl_path.name}"
            
            shutil.copy2(img_path, out_path / split_name / 'images' / unique_name)
            
            # Read label and ensure class ID is 1 (auto_annotate.py should have done this, but we force it)
            with open(lbl_path, 'r') as f:
                lines = f.readlines()
                
            new_lines = []
            for line in lines:
                parts = line.strip().split()
                if len(parts) >= 5:
                    parts[0] = '1' # Force class ID to 1
                    new_lines.append(" ".join(parts))
                    
            with open(out_path / split_name / 'labels' / unique_lbl_name, 'w') as f:
                f.write("\n".join(new_lines))
                
            total_images_copied += 1

    # ── 4. Generate unified data.yaml ────────────────────────────────────
    yaml_content = f"""
train: {out_path.absolute().as_posix()}/train/images
val: {out_path.absolute().as_posix()}/valid/images
test: {out_path.absolute().as_posix()}/test/images

nc: 2
names: ['railway-gap', 'animal']
    """
    
    with open(out_path / 'data.yaml', 'w') as f:
        f.write(yaml_content.strip())
        
    print("\n" + "=" * 50)
    print("SUCCESS! Unified dataset created.")
    print(f"Total images: {total_images_copied}")
    print(f"Output directory: {out_path.absolute()}")
    print("Dataset config: data.yaml")
    print("=" * 50)

if __name__ == "__main__":
    crack_dir = r"C:\Users\Melroy Quadros\tain\dataset"
    animal_dir = r"C:\Users\Melroy Quadros\Downloads\gandu"
    out_dir = r"C:\Users\Melroy Quadros\tain\unified_dataset"
    
    merge_datasets(crack_dir, animal_dir, out_dir)
