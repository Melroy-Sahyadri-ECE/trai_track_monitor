# Railway Track Monitor

A real-time hybrid crack detection system combined with a live monitoring dashboard. Uses a two-stage **YOLOv8 + MobileNetV2** pipeline for accurate detection with minimal false positives.

---

## How It Works

1. **YOLOv8** scans frames and proposes candidate crack regions
2. **MobileNetV2 CNN** verifies each region — real crack or background noise
3. **Fusion** combines both confidence scores and assigns severity: 🟢 Low / 🟡 Medium / 🔴 High

---

## Setup

**Requirements:** Python 3.12, CUDA 12.4 (optional for GPU)

```bash
git clone https://github.com/Melroy-Sahyadri-ECE/train_track_monitor.git
cd train_track_monitor
python -m venv venv && source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
pip install ultralytics opencv-python
```

> For CPU-only, replace the PyTorch install with: `pip install torch torchvision`

---

## Running Detection

```bash
python detect_live.py                        # Default webcam
python detect_live.py --source 1             # Secondary webcam
python detect_live.py --source video.mp4     # Video file
```

**Live Controls:**

| Key | Action |
|-----|--------|
| `q` | Quit |
| `s` | Save screenshot |
| `p` | Pause / Resume |
| `+` / `-` | Adjust YOLO confidence threshold |

---

## Project Structure

```
train_track_monitor/
├── detect_live.py              # Main entry point
├── hybrid_detector.py          # YOLO + CNN fusion pipeline
├── train_yolo.py               # YOLOv8 training script
├── train_classifier.py         # MobileNetV2 training script
├── runs/.../best.pt            # Trained YOLOv8 weights
├── models/crack_classifier.pth # Trained CNN weights
└── dashboard/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── app.js
        ├── datasource.js
        ├── trackmap.js
        ├── health.js
        ├── gauge.js
        ├── fft.js
        ├── events.js
        ├── summary.js
        └── settings.js
```

---

## Model Performance

| Model | Metric | Result |
|-------|--------|--------|
| YOLOv8-nano | mAP50 (100 epochs, 900+ images) | ~0.565 |
| MobileNetV2 | Validation Accuracy | 100% |

---

## Dashboard

Real-time monitoring UI with GPS tracking, vibration analysis, and gauge measurements.

```bash
python -m http.server 8000
# Open http://localhost:8000
```

**Panels:**
- Track Map — GPS-based color-coded pin visualization
- Health Profile — Vibration score vs chainage
- Gauge Profile — Deviation from 1676mm nominal
- Live FFT — Real-time frequency spectrum
- Events Table — Timestamped event log with verdicts
- Summary Stats — Distribution chart + key metrics

**Color coding:** 🟢 Good · 🟡 Suspicious · 🔴 Critical

**Stack:** HTML5, CSS3, JavaScript (ES6+), Chart.js

---

## Upcoming

- [ ] Google Maps integration
- [ ] PDF/CSV export
- [ ] Historical data analysis
- [ ] User authentication
- [ ] Mobile app

---

## License

MIT
