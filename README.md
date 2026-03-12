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

---

# Dashboard - Real-Time Monitoring System

A modern, dark-themed dashboard for real-time monitoring of railway track health with GPS tracking, vibration analysis, and gauge measurements.

## Features

### 📍 Track Map
- GPS-based track visualization
- Color-coded pins (Green/Yellow/Red) based on verdict
- Ready for Google Maps integration
- Real-time location tracking

### 📊 Health Profile
- Vibration score monitoring vs chainage (km)
- Visual trend analysis
- Critical threshold detection

### 📐 Gauge Profile
- Gauge deviation tracking from 1676mm nominal
- Chainage-based measurements
- Tolerance monitoring

### 📈 Live FFT
- Real-time frequency spectrum analysis
- Last measurement visualization
- Signal processing insights

### 📋 Events Table
- Comprehensive event logging
- Timestamp and chainage tracking
- Verdict classification
- Vibration scores and gauge readings

### 📊 Summary Stats
- **Circular Chart**: Visual distribution of Good, Suspicious, and Critical readings
- Total readings counter
- Critical and suspect count tracking
- Average vibration score
- Maximum gauge deviation
- Real-time statistics

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js
- **Maps**: Placeholder for Google Maps API
- **Styling**: Custom CSS with dark theme
- **Fonts**: Inter (Google Fonts)

## Getting Started

### Prerequisites
- Python 3.x (for local server)
- Modern web browser
- Internet connection (for CDN resources)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Melroy-Sahyadri-ECE/dashboard.git
cd dashboard
```

2. Start a local server:
```bash
python -m http.server 8000
```

3. Open your browser and navigate to:
```
http://localhost:8000
```

## Project Structure

```
dashboard/
├── index.html          # Main HTML file
├── css/
│   └── style.css      # Styling and theme
├── js/
│   ├── app.js         # Main application logic
│   ├── datasource.js  # Data source management
│   ├── trackmap.js    # Track map functionality
│   ├── health.js      # Health profile charts
│   ├── gauge.js       # Gauge profile charts
│   ├── fft.js         # FFT visualization
│   ├── events.js      # Events table
│   ├── summary.js     # Summary statistics with circular chart
│   └── settings.js    # Settings panel
└── README.md          # This file
```

## Features in Detail

### Color Coding System
- 🟢 **Green**: Good condition (normal readings)
- 🟡 **Yellow**: Suspicious (warning threshold)
- 🔴 **Red**: Critical (requires immediate attention)

### Data Visualization
- Interactive charts with Chart.js
- Responsive design for all screen sizes
- Real-time data updates
- Smooth animations and transitions

### Settings Panel
- Configurable data source endpoints
- Panel-specific settings
- Live/Demo mode toggle

## Upcoming Features

- [ ] Google Maps integration
- [ ] Real-time data streaming
- [ ] Export functionality (PDF/CSV)
- [ ] Advanced filtering options
- [ ] User authentication
- [ ] Historical data analysis
- [ ] Mobile app version

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please open an issue on GitHub.
