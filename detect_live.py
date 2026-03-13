"""
Railway Crack Detection — Live Camera Detection
=================================================
Real-time crack detection from webcam or video file
using the Hybrid YOLOv8 + CNN pipeline.

Controls:
  q  → Quit
  s  → Save screenshot
  p  → Pause/resume
  +  → Increase YOLO confidence threshold
  -  → Decrease YOLO confidence threshold
"""

import sys
import time
import argparse
from pathlib import Path
from datetime import datetime

import sys
import time
import argparse
import threading
from pathlib import Path
from datetime import datetime

import cv2
import numpy as np

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from hybrid_detector import HybridDetector


class ThreadedCamera:
    """Read frames in a background thread to clear the buffer instantly and get 30+ FPS."""
    def __init__(self, source_url):
        self.source = source_url
        if isinstance(source_url, str) and source_url.isdigit():
            self.source = int(source_url)
            
        if isinstance(self.source, str) and (self.source.startswith('http') or self.source.startswith('rtsp')):
            self.cap = cv2.VideoCapture(self.source, cv2.CAP_FFMPEG)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        else:
            self.cap = cv2.VideoCapture(self.source)
            
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
        self.actual_w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.actual_h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        self.ret = False
        self.frame = None
        self.running = True
        
        # Read first frame
        if self.cap.isOpened():
            self.ret, self.frame = self.cap.read()
            self.thread = threading.Thread(target=self.update, args=())
            self.thread.daemon = True
            self.thread.start()

    def update(self):
        # Background thread continuously pulls latest frame
        while self.running:
            if self.cap.isOpened():
                if isinstance(self.source, str) and (self.source.startswith('http') or self.source.startswith('rtsp')):
                    self.cap.grab()
                ret, frame = self.cap.read()
                if ret:
                    self.ret, self.frame = ret, frame
            time.sleep(0.005) # Prevent CPU pegging
            
    def read(self):
        return self.ret, self.frame

    def release(self):
        self.running = False
        if hasattr(self, 'thread'):
            self.thread.join(timeout=1.0)
        self.cap.release()

    def isOpened(self):
        return self.cap.isOpened()


def create_info_panel(frame: np.ndarray, fps: float, detections: list,
                      yolo_conf: float, paused: bool) -> np.ndarray:
    """Create an info panel at the top of the frame."""
    h, w = frame.shape[:2]
    panel_h = 80
    panel = np.zeros((panel_h, w, 3), dtype=np.uint8)

    # Background gradient
    for i in range(panel_h):
        alpha = 1.0 - (i / panel_h) * 0.5
        panel[i, :] = [int(30 * alpha), int(30 * alpha), int(40 * alpha)]

    # Title
    cv2.putText(panel, "RAILWAY CRACK DETECTION SYSTEM", (10, 25),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)

    # Status info
    status_color = (0, 255, 0) if not paused else (0, 255, 255)
    status_text = "LIVE" if not paused else "PAUSED"
    cv2.putText(panel, f"[{status_text}]", (w - 120, 25),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)

    # Stats line
    det_count = len(detections)
    det_color = (0, 255, 0) if det_count == 0 else (0, 0, 255)
    severity_text = ""
    
    if detections:
        severities = [d['severity'] for d in detections]
        labels = [d['label'] for d in detections]
        
        if "high" in severities:
            severity_text = " | ALERT: HIGH SEVERITY CRACK!"
            det_color = (0, 0, 255)
        elif "animal" in severities:
            severity_text = f" | ANIMAL SPOTTED!"
            det_color = (255, 100, 0) # Blue-ish status
        elif "medium" in severities:
            severity_text = " | WARNING: Medium severity crack"
            det_color = (0, 200, 255)

    stats = (f"FPS: {fps:.1f}  |  Detections: {det_count}  |  "
             f"YOLO Conf: {yolo_conf:.0%}{severity_text}")
    cv2.putText(panel, stats, (10, 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, det_color, 1)

    # Controls hint
    cv2.putText(panel, "Q:Quit  S:Screenshot  P:Pause  +/-:Threshold", (10, 73),
                cv2.FONT_HERSHEY_SIMPLEX, 0.35, (150, 150, 150), 1)

    # Combine
    result = np.vstack([panel, frame])
    return result


def run_detection(source="0", yolo_model=None, classifier_model=None, 
                  yolo_conf=0.25, save_dir="screenshots"):
    """Main detection loop."""

    # ── Initialize detector ────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  RAILWAY CRACK DETECTION — LIVE MODE")
    print("=" * 60)

    detector = HybridDetector(
        yolo_model_path=yolo_model,
        classifier_model_path=classifier_model,
        yolo_conf=yolo_conf,
    )

    # ── Open camera/video ──────────────────────────────────────────────
    print(f"\n[INFO] Opening source: {source}")
    cap = ThreadedCamera(source)

    if not cap.isOpened():
        print(f"ERROR: Could not open video source: {source}")
        print("  - For local webcam:  python detect_live.py --source 0")
        print("  - For IP Webcam app: python detect_live.py --source http://192.168.x.x:8080/video")
        print("  - For video file:    python detect_live.py --source path/to/video.mp4")
        sys.exit(1)

    print(f"[INFO] Source resolution: {cap.actual_w}x{cap.actual_h}")

    # ── State ──────────────────────────────────────────────────────────
    save_path = Path(save_dir)
    save_path.mkdir(parents=True, exist_ok=True)
    current_yolo_conf = yolo_conf
    paused = False
    frame_count = 0
    fps = 0.0
    fps_start = time.time()

    print("\n[INFO] Detection started! Press 'q' to quit.\n")

    while True:
        if not paused:
            ret, frame = cap.read()
            if not ret or frame is None:
                if isinstance(cap.source, int):
                    print("[WARN] Camera frame lost, retrying...")
                    time.sleep(0.1)
                    continue
                else:
                    print("[WARN] Stream disconnected or video ended.")
                    break

            # ── Run detection ──────────────────────────────────────────
            t0 = time.time()
            detections = detector.detect(frame)
            dt = time.time() - t0

            # ── Draw results ───────────────────────────────────────────
            annotated = detector.draw(frame, detections)

            # ── FPS calculation ────────────────────────────────────────
            frame_count += 1
            elapsed = time.time() - fps_start
            if elapsed >= 1.0:
                fps = frame_count / elapsed
                frame_count = 0
                fps_start = time.time()

            # ── Add info panel ─────────────────────────────────────────
            display = create_info_panel(annotated, fps, detections,
                                        current_yolo_conf, paused)
        else:
            # While paused, re-display last frame
            display = create_info_panel(annotated, fps, detections,
                                        current_yolo_conf, paused)

        # Use a slightly smaller window for IP cameras if they are very high res (e.g., 4K phone cameras)
        if cap.actual_h > 1080:
            display_scaled = cv2.resize(display, (int(cap.actual_w * 720 / cap.actual_h), 720 + 80))  # 80 is panel_h
            cv2.imshow("Railway Crack Detection", display_scaled)
        else:
            cv2.imshow("Railway Crack Detection", display)

        # ── Keyboard controls ──────────────────────────────────────────
        key = cv2.waitKey(1) & 0xFF

        if key == ord('q'):
            print("\n[INFO] Quitting...")
            break

        elif key == ord('s'):
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            ss_path = save_path / f"crack_detect_{timestamp}.jpg"
            cv2.imwrite(str(ss_path), display)
            print(f"[SCREENSHOT] Saved: {ss_path}")

        elif key == ord('p'):
            paused = not paused
            print(f"[INFO] {'Paused' if paused else 'Resumed'}")

        elif key == ord('+') or key == ord('='):
            current_yolo_conf = min(0.95, current_yolo_conf + 0.05)
            detector.yolo_conf = current_yolo_conf
            print(f"[INFO] YOLO confidence: {current_yolo_conf:.0%}")

        elif key == ord('-') or key == ord('_'):
            current_yolo_conf = max(0.05, current_yolo_conf - 0.05)
            detector.yolo_conf = current_yolo_conf
            print(f"[INFO] YOLO confidence: {current_yolo_conf:.0%}")

    cap.release()
    cv2.destroyAllWindows()
    print("[DONE] Camera released.")


def main():
    parser = argparse.ArgumentParser(
        description="Railway Crack Detection — Live Camera",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python detect_live.py                                         # Use default webcam
  python detect_live.py --source 1                              # Use second usb camera
  python detect_live.py --source http://192.168.31.211:4747/video # Phone DroidCam App
  python detect_live.py --source vid.mp4                        # Process video file
  python detect_live.py --yolo-conf 0.4                         # Higher threshold = fewer FP
        """,
    )
    parser.add_argument("--source", default="0",
                        help="Camera index, IP Webcam URL, or video file path (default: 0)")
    parser.add_argument("--yolo-model", default=None,
                        help="Path to YOLOv8 best.pt")
    parser.add_argument("--classifier-model", default=None,
                        help="Path to crack_classifier.pth")
    parser.add_argument("--yolo-conf", type=float, default=0.25,
                        help="YOLO confidence threshold (default: 0.25)")
    parser.add_argument("--save-dir", default="screenshots",
                        help="Directory for screenshots (default: screenshots)")

    args = parser.parse_args()

    run_detection(
        source=args.source,
        yolo_model=args.yolo_model,
        classifier_model=args.classifier_model,
        yolo_conf=args.yolo_conf,
        save_dir=args.save_dir,
    )


if __name__ == "__main__":
    main()
