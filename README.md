# Railway Crack Detection — Hybrid System

This repository contains a **real-time hybrid railway crack detection system** built using a two-stage approach: **YOLOv8** + **MobileNetV2 CNN**. It is designed to run efficiently on live camera feeds or video files.

## 🌟 How It Works

Instead of relying solely on YOLO, this project uses a two-stage **Hybrid Detector**:
1. **Stage 1 (YOLOv8)**: Rapidly scans the image and proposes candidate bounding boxes where a "railway-gap" (crack) might exist.
2. **Stage 2 (CNN Classifier)**: Extracts the cropped region from YOLO's bounding box and runs it through a custom-trained **MobileNetV2** binary classifier to verify if it is truly a crack or just background noise.
3. **Fusion**: The confidence scores are fused together. If both models agree, the crack is flagged with a color-coded severity level (🟢 Low, 🟡 Medium, 🔴 High).

This hybrid approach drastically reduces false positives while maintaining the high detection speed of YOLOv8.

---

## 🚀 Getting Started

### Prerequisites
You need **Python 3.12** installed on your system.
For NVIDIA GPU acceleration, ensure you have the appropriate CUDA drivers installed.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Melroy-Sahyadri-ECE/train_track_monitor.git
   cd train_track_monitor
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```

3. **Install dependencies:**
   *(Note: PyTorch command is specific for CUDA 12.4. Adjust if you use CPU-only or a different CUDA version).*
   ```bash
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
   pip install ultralytics opencv-python
   ```

---

## 📷 Running Live Camera Detection

The main script is `detect_live.py`. This script connects to your webcam (or a video file) and runs the hybrid detection pipeline in real-time.

```bash
python detect_live.py
```

### 🎮 Live Controls:
- `q` : Quit the application
- `s` : Save a screenshot of the current frame (saved to `screenshots/`)
- `p` : Pause or resume the camera feed
- `+` / `-` : Increase or decrease the YOLO confidence threshold on the fly

### 🛠️ Options:
You can specify different camera sources or video files:
```bash
# Use a secondary webcam
python detect_live.py --source 1

# Run on a saved video file
python detect_live.py --source input_video.mp4
```

---

## 📁 Repository Structure

- `detect_live.py`: Main entry point for real-time detection UI.
- `hybrid_detector.py`: Core logic for the two-stage YOLO + CNN fusion pipeline.
- `train_yolo.py`: Script used to train the YOLOv8-nano model.
- `train_classifier.py`: Script used to extract YOLO crop regions and train the MobileNetV2 verification classifier.
- `runs/railway_crack_yolo/weights/best.pt`: The trained YOLOv8 model weights.
- `models/crack_classifier.pth`: The trained MobileNetV2 CNN weights.

---

## 📊 Training Performance

- **YOLOv8-nano Model**: Reached a mean Average Precision (mAP50) of ~0.565 over 100 epochs on a 900+ image dataset.
- **MobileNetV2 Classifier**: Achieved **100.0% validation accuracy** at differentiating true cracks from background noise crops in the dataset.
