"""
Railway Crack Detection — Hybrid Detector
==========================================
Two-stage detection pipeline:
  Stage 1: YOLOv8 detects candidate crack regions
  Stage 2: CNN classifier verifies each region (crack vs no-crack)

Confidence fusion reduces false positives significantly.
"""

import sys
from pathlib import Path

import cv2
import numpy as np


class HybridDetector:
    """
    Hybrid YOLOv8 + CNN crack detector.

    Usage:
        detector = HybridDetector()
        detections = detector.detect(frame)
        annotated = detector.draw(frame, detections)
    """

    def __init__(
        self,
        yolo_model_path: str = None,
        classifier_model_path: str = None,
        yolo_conf: float = 0.15,          # Lowered for higher sensitivity
        classifier_conf: float = 0.40,    # Lowered CNN strictness
        fusion_weight: float = 0.7,       # Give YOLO more authority
        device: str = "auto",
    ):
        """
        Args:
            yolo_model_path: Path to YOLOv8 best.pt
            classifier_model_path: Path to crack_classifier.pth
            yolo_conf: Min confidence for YOLO detections
            classifier_conf: Min confidence for CNN classifier
            fusion_weight: Weight for YOLO in final score (1-weight for CNN)
            device: "auto", "cuda", or "cpu"
        """
        try:
            import torch
            from ultralytics import YOLO
            from torchvision import transforms, models
            import torch.nn as nn
        except ImportError as e:
            print(f"ERROR: Missing dependency: {e}")
            sys.exit(1)

        self.torch = torch
        self.nn = nn

        # ── Device ─────────────────────────────────────────────────────
        if device == "auto":
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)

        print(f"[HybridDetector] Device: {self.device}")

        # ── Paths ──────────────────────────────────────────────────────
        root = Path(__file__).resolve().parent

        if yolo_model_path is None:
            yolo_model_path = str(root / "runs" / "railway_crack_yolo" / "weights" / "best.pt")
        if classifier_model_path is None:
            classifier_model_path = str(root / "models" / "crack_classifier.pth")

        # ── Load YOLOv8 ───────────────────────────────────────────────
        print(f"[HybridDetector] Loading YOLO: {yolo_model_path}")
        self.yolo = YOLO(yolo_model_path)
        self.yolo_conf = yolo_conf

        # ── Load CNN Classifier ────────────────────────────────────────
        print(f"[HybridDetector] Loading CNN classifier: {classifier_model_path}")
        self.classifier = models.mobilenet_v2(weights=None)
        self.classifier.classifier[1] = nn.Linear(
            self.classifier.last_channel, 2
        )

        checkpoint = torch.load(classifier_model_path, map_location=self.device, weights_only=True)
        self.classifier.load_state_dict(checkpoint['model_state_dict'])
        self.classifier = self.classifier.to(self.device)
        self.classifier.eval()

        print(f"  Classifier accuracy: {checkpoint.get('accuracy', 'N/A')}%")

        # ── Classifier preprocessing ──────────────────────────────────
        self.classifier_transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((128, 128)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

        self.classifier_conf = classifier_conf
        self.fusion_weight = fusion_weight

        # ── Severity colors (BGR) ─────────────────────────────────────
        self.colors = {
            "low": (0, 255, 0),       # Green
            "medium": (0, 200, 255),   # Yellow
            "high": (0, 0, 255),       # Red
        }

        print("[HybridDetector] Ready!")

    def detect(self, frame: np.ndarray) -> list:
        """
        Run hybrid detection on a single frame.

        Returns list of dicts:
            [{
                'bbox': (x1, y1, x2, y2),
                'yolo_conf': float,
                'cnn_conf': float,
                'fused_conf': float,
                'severity': str,
                'label': str
            }, ...]
        """
        detections = []

        # Stage 1: YOLO detection
        results = self.yolo(frame, conf=self.yolo_conf, verbose=False)

        if len(results) == 0 or results[0].boxes is None or len(results[0].boxes) == 0:
            return detections

        boxes = results[0].boxes
        h, w = frame.shape[:2]

        for i in range(len(boxes)):
            # Get bounding box
            x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy().astype(int)
            yolo_conf = float(boxes.conf[i].cpu().numpy())

            # Clamp to frame
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)

            # Stage 2: CNN classification
            crop = frame[y1:y2, x1:x2]
            if crop.size == 0 or crop.shape[0] < 5 or crop.shape[1] < 5:
                continue

            crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            input_tensor = self.classifier_transform(crop_rgb).unsqueeze(0).to(self.device)

            with self.torch.no_grad():
                outputs = self.classifier(input_tensor)
                probs = self.torch.softmax(outputs, dim=1)
                cnn_conf = float(probs[0, 1].cpu().numpy())  # P(crack)

            # Confidence fusion
            fused_conf = (self.fusion_weight * yolo_conf +
                          (1 - self.fusion_weight) * cnn_conf)

            # Only keep if CNN also agrees
            if cnn_conf >= self.classifier_conf:
                severity = self._get_severity(fused_conf)
                detections.append({
                    'bbox': (x1, y1, x2, y2),
                    'yolo_conf': yolo_conf,
                    'cnn_conf': cnn_conf,
                    'fused_conf': fused_conf,
                    'severity': severity,
                    'label': 'Railway Crack',
                })

        return detections

    def _get_severity(self, confidence: float) -> str:
        """Map confidence to severity level."""
        if confidence >= 0.75:
            return "high"
        elif confidence >= 0.50:
            return "medium"
        else:
            return "low"

    def draw(self, frame: np.ndarray, detections: list) -> np.ndarray:
        """Draw detection results on a frame."""
        annotated = frame.copy()

        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            color = self.colors[det['severity']]
            fused = det['fused_conf']

            # Draw bounding box
            thickness = 3 if det['severity'] == "high" else 2
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, thickness)

            # Label background
            label = f"{det['label']} {fused:.0%} [{det['severity'].upper()}]"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
            cv2.rectangle(annotated, (x1, y1 - th - 10), (x1 + tw + 5, y1), color, -1)
            cv2.putText(annotated, label, (x1 + 2, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

            # Sub-label with detail
            detail = f"YOLO:{det['yolo_conf']:.0%} CNN:{det['cnn_conf']:.0%}"
            cv2.putText(annotated, detail, (x1 + 2, y2 + 18),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

        return annotated

    def test_on_folder(self, folder: str, output_dir: str = "test_results"):
        """Run detection on all images in a folder and save results."""
        folder = Path(folder)
        output = Path(output_dir)
        output.mkdir(parents=True, exist_ok=True)

        images = list(folder.glob("*.jpg")) + list(folder.glob("*.png"))
        total_detections = 0

        print(f"\n[TEST] Processing {len(images)} images from {folder}")
        print(f"[TEST] Output: {output}\n")

        for img_path in images:
            frame = cv2.imread(str(img_path))
            if frame is None:
                continue

            detections = self.detect(frame)
            total_detections += len(detections)

            annotated = self.draw(frame, detections)

            out_path = output / f"det_{img_path.name}"
            cv2.imwrite(str(out_path), annotated)

            status = f"  {img_path.name}: {len(detections)} detections"
            if detections:
                confs = [d['fused_conf'] for d in detections]
                status += f" (conf: {min(confs):.0%}-{max(confs):.0%})"
            print(status)

        print(f"\n[TEST] Total: {total_detections} detections across {len(images)} images")
        return total_detections
