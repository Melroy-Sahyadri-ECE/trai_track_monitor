"""
Railway Crack Detection — CNN Classifier Training
===================================================
Trains a lightweight MobileNetV2-based binary classifier
to verify YOLO detections (crack vs no-crack).

This is the second stage of the hybrid pipeline.
"""

import os
import sys
import random
import shutil
from pathlib import Path

import cv2
import numpy as np


def prepare_classifier_dataset(root: Path):
    """
    Extracts crack regions from YOLO labels + images.
    Also creates negative samples from unannotated regions.
    """
    output_dir = root / "classifier_dataset"
    pos_dir = output_dir / "crack"
    neg_dir = output_dir / "no_crack"

    # Clean and recreate
    if output_dir.exists():
        shutil.rmtree(output_dir)
    pos_dir.mkdir(parents=True)
    neg_dir.mkdir(parents=True)

    splits = ["train", "valid"]
    pos_count = 0
    neg_count = 0

    for split in splits:
        img_dir = root / "dataset" / split / "images"
        lbl_dir = root / "dataset" / split / "labels"

        if not img_dir.exists():
            continue

        image_files = list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.png"))

        for img_path in image_files:
            img = cv2.imread(str(img_path))
            if img is None:
                continue

            h, w = img.shape[:2]
            lbl_name = img_path.stem + ".txt"
            lbl_path = lbl_dir / lbl_name

            crack_boxes = []

            # ── Positive samples: crop annotated regions ──────────────
            if lbl_path.exists():
                with open(lbl_path, "r") as f:
                    for line in f:
                        parts = line.strip().split()
                        if len(parts) >= 5:
                            _, cx, cy, bw, bh = map(float, parts[:5])
                            x1 = int((cx - bw / 2) * w)
                            y1 = int((cy - bh / 2) * h)
                            x2 = int((cx + bw / 2) * w)
                            y2 = int((cy + bh / 2) * h)

                            # Add padding (20%)
                            pad_x = int((x2 - x1) * 0.2)
                            pad_y = int((y2 - y1) * 0.2)
                            x1 = max(0, x1 - pad_x)
                            y1 = max(0, y1 - pad_y)
                            x2 = min(w, x2 + pad_x)
                            y2 = min(h, y2 + pad_y)

                            crack_boxes.append((x1, y1, x2, y2))

                            crop = img[y1:y2, x1:x2]
                            if crop.size > 0 and crop.shape[0] > 10 and crop.shape[1] > 10:
                                crop_resized = cv2.resize(crop, (128, 128))
                                cv2.imwrite(str(pos_dir / f"{split}_{pos_count:05d}.jpg"), crop_resized)
                                pos_count += 1

            # ── Negative samples: random crops from non-annotated regions ──
            num_neg = max(1, len(crack_boxes)) if crack_boxes else 2
            for _ in range(num_neg):
                for attempt in range(20):
                    crop_w = random.randint(50, min(300, w // 2))
                    crop_h = random.randint(50, min(300, h // 2))
                    rx = random.randint(0, w - crop_w)
                    ry = random.randint(0, h - crop_h)

                    # Check no overlap with crack boxes
                    overlaps = False
                    for bx1, by1, bx2, by2 in crack_boxes:
                        if rx < bx2 and rx + crop_w > bx1 and ry < by2 and ry + crop_h > by1:
                            overlaps = True
                            break

                    if not overlaps:
                        crop = img[ry:ry + crop_h, rx:rx + crop_w]
                        if crop.size > 0:
                            crop_resized = cv2.resize(crop, (128, 128))
                            cv2.imwrite(str(neg_dir / f"{split}_{neg_count:05d}.jpg"), crop_resized)
                            neg_count += 1
                        break

    print(f"[INFO] Classifier dataset prepared:")
    print(f"  Positive (crack):    {pos_count} images")
    print(f"  Negative (no_crack): {neg_count} images")
    print(f"  Location: {output_dir}")

    return output_dir


def train_classifier(root: Path):
    """Train MobileNetV2-based binary classifier."""
    try:
        import torch
        import torch.nn as nn
        import torch.optim as optim
        from torch.utils.data import DataLoader, Dataset
        from torchvision import transforms, models
    except ImportError:
        print("ERROR: torch/torchvision not installed.")
        sys.exit(1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[INFO] Using device: {device}")

    # ── Dataset ────────────────────────────────────────────────────────
    class CrackDataset(Dataset):
        def __init__(self, data_dir, transform=None):
            self.samples = []
            self.transform = transform

            crack_dir = data_dir / "crack"
            no_crack_dir = data_dir / "no_crack"

            for img_path in crack_dir.glob("*.jpg"):
                self.samples.append((str(img_path), 1))
            for img_path in no_crack_dir.glob("*.jpg"):
                self.samples.append((str(img_path), 0))

            random.shuffle(self.samples)
            print(f"  Loaded {len(self.samples)} samples "
                  f"({sum(1 for _, l in self.samples if l == 1)} crack, "
                  f"{sum(1 for _, l in self.samples if l == 0)} no_crack)")

        def __len__(self):
            return len(self.samples)

        def __getitem__(self, idx):
            img_path, label = self.samples[idx]
            img = cv2.imread(img_path)
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            if self.transform:
                img = self.transform(img)
            return img, label

    # ── Transforms ─────────────────────────────────────────────────────
    train_transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    val_transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    # ── Split into train/val ───────────────────────────────────────────
    dataset_dir = root / "classifier_dataset"
    full_dataset = CrackDataset(dataset_dir, transform=train_transform)
    val_dataset = CrackDataset(dataset_dir, transform=val_transform)

    total = len(full_dataset)
    train_size = int(0.8 * total)
    val_size = total - train_size

    train_indices = list(range(train_size))
    val_indices = list(range(train_size, total))

    train_subset = torch.utils.data.Subset(full_dataset, train_indices)
    val_subset = torch.utils.data.Subset(val_dataset, val_indices)

    train_loader = DataLoader(train_subset, batch_size=32, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_subset, batch_size=32, shuffle=False, num_workers=0)

    # ── Model: MobileNetV2 (pretrained) ───────────────────────────────
    model = models.mobilenet_v2(weights='IMAGENET1K_V1')
    model.classifier[1] = nn.Linear(model.last_channel, 2)  # Binary: crack / no_crack
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.5)

    # ── Training Loop ──────────────────────────────────────────────────
    best_acc = 0.0
    best_model_path = root / "models" / "crack_classifier.pth"
    best_model_path.parent.mkdir(parents=True, exist_ok=True)

    num_epochs = 30

    print("\n" + "=" * 60)
    print("  CNN CLASSIFIER TRAINING")
    print("=" * 60)

    for epoch in range(num_epochs):
        # Train
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item()
            _, predicted = outputs.max(1)
            train_total += labels.size(0)
            train_correct += predicted.eq(labels).sum().item()

        # Validate
        model.eval()
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                _, predicted = outputs.max(1)
                val_total += labels.size(0)
                val_correct += predicted.eq(labels).sum().item()

        train_acc = 100.0 * train_correct / train_total
        val_acc = 100.0 * val_correct / max(val_total, 1)

        print(f"  Epoch [{epoch+1:3d}/{num_epochs}] "
              f"Loss: {train_loss/len(train_loader):.4f}  "
              f"Train Acc: {train_acc:.1f}%  "
              f"Val Acc: {val_acc:.1f}%")

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save({
                'model_state_dict': model.state_dict(),
                'accuracy': best_acc,
                'epoch': epoch + 1,
            }, str(best_model_path))

        scheduler.step()

    print(f"\n[DONE] Best validation accuracy: {best_acc:.1f}%")
    print(f"[DONE] Model saved: {best_model_path}")

    return best_model_path


def main():
    root = Path(__file__).resolve().parent

    print("=" * 60)
    print("  STEP 1: Preparing classifier dataset from YOLO labels")
    print("=" * 60)
    prepare_classifier_dataset(root)

    print("\n" + "=" * 60)
    print("  STEP 2: Training CNN classifier")
    print("=" * 60)
    train_classifier(root)


if __name__ == "__main__":
    main()
