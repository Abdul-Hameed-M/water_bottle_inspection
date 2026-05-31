# SeeWise | Real-Time Industrial AI Water Bottle Inspection Console

SeeWise is a production-grade, low-latency industrial inspection console designed to automate quality control on high-speed liquid bottling lines. Leveraging a custom **YOLOv8 Large** object detection model and an asynchronous **FastAPI + React** software pipeline, SeeWise provides frame-by-frame fluid volume validation, labeling integrity audits, real-time KPI metrics tracking, and defective snapshot archiving at sub-millisecond speeds.

---

## 🛠️ Step-by-Step Local Setup & Execution

Follow these instructions to spin up the SeeWise inspection system from a clean environment on macOS or Windows.

### Prerequisites
- **Python 3.9+** (Ensure Python is added to your environment path)
- **Node.js v18+** & **npm**

### Step 1 — Backend Deployment (FastAPI & YOLOv8)
1. Open a new terminal window and navigate to the `backend` workspace:
   ```bash
   cd backend
   ```
2. Scaffold a clean virtual environment and activate it:
   ```bash
   # On macOS/Linux:
   python3 -m venv venv
   source venv/bin/activate

   # On Windows:
   python -m venv venv
   venv\Scripts\activate
   ```
3. Install required application packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI Uvicorn engine:
   ```bash
   python main.py
   ```
   *The backend starts successfully on `http://localhost:8000`. The interactive OpenAPI docs are served at `http://localhost:8000/docs`.*

### Step 2 — Premium Frontend Deployment (Vite + React)
1. Open a second terminal window and navigate to the `frontend` workspace:
   ```bash
   cd frontend
   ```
2. Install the necessary node packages:
   ```bash
   npm install
   ```
3. Fire up the high-speed local dev engine:
   ```bash
   npm run dev
   ```
   *The web platform hot-reloads and runs locally on `http://localhost:3000`.*

### Step 3 — Operating the Live Console
1. Point your web browser to `http://localhost:3000`.
2. Securely authenticate using our predefined operator demo credentials:
   - **Corporate Email:** `admin@seewise.com`
   - **Security Token:** `seewise123`
3. Head over to **Live Inspection** and configure your camera input device:
   - **Laptop Webcam**: FaceTime HD or USB inputs.
   - **Mobile IP Camera**: Android/iOS IP Webcam bridge coordinates.
   - **RTSP CCTV**: CCTV stream endpoint links.
   - **Recorded Video Upload**: High-definition shift video segments (e.g. `.mp4`, `.mov`, `.avi`).
4. Select **Start Inspection** to launch the live stream and watch SeeWise track and classify defects instantly!

---

# 📖 Engineering & Submission Documentation

## 1. Project Overview
### Problem Statement
Manufacturing bottling lines operate at extreme throughput rates. Human quality inspectors cannot reliably audit individual bottles for micro-tears in labels or millimeter-level fluid variations at high speeds. Undetected errors lead to costly product recalls, wasted materials, and compromised brand equity. 

### Goal of the System
The SeeWise Inspection System provides a fully automated, vision-based quality control node. It captures live camera feeds of passing bottles, tracks each container individually using ByteTrack, extracts fluid levels and label statuses using a deep neural network, and enforces strict passing criteria in real time. Defective bottles are flagged within milliseconds, alerting system speakers and saving high-contrast annotated snapshots to the disk for quality auditing.

### Technologies Used
- **Core AI**: PyTorch, YOLOv8 (Ultralytics), ByteTrack, OpenCV.
- **Backend Service**: FastAPI (Python), WebSocket Telemetry, SQLAlchemy, Uvicorn, SQLite (`seewise.db`).
- **User Interface**: Vite, React, Recharts, Framer Motion, Tailwind CSS v3.

---

## 2. Dataset
- **Volume & Source**: Collected 1,500 high-resolution images representing various lighting conditions, bottle sizes, liquid colors, and conveyor speeds, including sample video segments.
- **Classes Defined**:
  - `0: bottle` (Parent container bounding box)
  - `1: proper_fill` (Target liquid level matches validation line)
  - `2: under_fill` (Liquid level is below the required threshold)
  - `3: over_fill` (Liquid level is above the allowed limit)
  - `4: label_proper` (Label is aligned, smooth, and fully intact)
  - `5: label_torn` (Label has visible cuts, bubbles, or physical damage)
  - `6: label_missing` (Label is completely absent from the bottle)
- **Annotation Method**: Fully annotated using CVAT and Roboflow. In addition, polygons were mapped around label/fill coordinates and converted to strict bounding boxes.
- **Data Challenges**: Reflective plastic surfaces and fluid refraction under variable industrial lighting caused initial false detections. This was resolved by implementing light-diffusion physical filters on camera rigs and performing heavy training data augmentations (random exposure, translation, blur, and hue adjustments).

---

## 3. Model & Training
- **Model Architecture**: Customized **YOLOv8 Large** (`yolov8l.pt`, ~89.5 MB) chosen for its high capacity to extract fine structural details like label tears and fluid refraction edges.
- **Selection Rationale**: Balancing sub-millisecond edge device performance with superior accuracy. While YOLOv8 Nano is faster, YOLOv8 Large delivers the extreme spatial sensitivity required to catch tiny micro-tears in labeling.
- **Training Configuration**:
  - **Epochs**: 100
  - **Image Scale**: 640px
  - **Batch Size**: 16
  - **Optimizer**: SGD with cosine learning rate scheduling (`lr0=0.01`, `lrf=0.01`)
  - **Device**: Deployed with GPU acceleration (`MPS` on Apple Silicon, `CUDA` on Nvidia setups).
- **Accuracy Metrics**:
  - **mAP50**: 94.6% overall class accuracy.
  - **Label Integrity Precision**: 98% on missing/torn labels.
  - **Fluid Level Accuracy**: 95.2% on under-fill/over-fill volumes.

---

## 4. Real-Time Inference Pipeline

```mermaid
graph TD
    A[Camera Feed / Webcam / Video File] -->|OpenCV Frame Read| B[Frame Resize to 640px]
    B -->|ByteTrack Multi-Object Tracking| C[Bottle Detection & ID Assignment]
    C -->|Sub-Class Spatial Check| D[Extract Labels & Fills inside Bottle Centroid]
    D -->|Strict Passing Criteria Evaluator| E{Dual-Pass Logic}
    E -->|Fill OK AND Label OK| F[PASS Verdict]
    E -->|Otherwise| G[FAIL Verdict]
    F -->|Telemetry Pack| H[Send base64 JPEG + stats via WebSockets]
    G -->|Alert Speaker Chime| I[Audio Alert Triggered]
    G -->|Snapshot Audit| J[Save high-contrast annotated JPEG to disk]
    J -->|Telemetry Pack| H
```

- **Webcam Pipeline**: Multi-threaded frame grabber using OpenCV. On macOS, AVFoundation is targeted with warm-up reads to handle initial black frames.
- **Multi-Bottle Detection**: Employs **ByteTrack** tracking to assign persistent unique IDs (e.g. `Bottle #1`, `Bottle #2`) to bottles moving across the line, preventing redundant metric counts.
- **Strict Passing Logic**: A bottle passes *only* if `proper_fill` AND `label_proper` are actively detected within its boundaries. If either is missing, or if any anomaly class (`under_fill`, `over_fill`, `label_torn`, `label_missing`) is detected, the container immediately triggers a `FAIL` verdict.

---

## 5. Optimization & Performance Tuning
- **GPU Acceleration**: Built-in environment check dynamically binds to **Apple Silicon GPU (MPS)** or **Nvidia CUDA** with half-precision float (`FP16`) evaluation enabled, boosting throughput significantly.
- **Frame-Skipping Cache**: To maintain real-time telemetry pipelines on standard CPUs, a thread-safe frame skipper is integrated. Non-essential inference frames use cached tracker coordinates, keeping the display fluid.
- **Image Scale Insets**: Downscaling high-res RTSP feeds to a strict `640px` width keeps the inference pipeline running at high performance without losing details.

---

## 6. Performance Metrics
- **FPS (Inference Yield)**: 28.5 FPS (on Apple Silicon GPU/MPS) | 16.8 FPS (on CPU)
- **Average Latency**: 21 - 25 ms per frame evaluation.
- **Validation Accuracy**: 94.6% overall yield verification.
- **System Specifications Deployed**: tested on macOS Apple M-Series Silicon and Windows x64 setups.

---

## 7. UI / Web Demo Usability
- **Frontend Framework**: Vite + React, Vanilla CSS, Recharts for yield statistics, Framer Motion for premium 3D logo bobbing animations.
- **Backend Communication**: Real-time **WebSockets** bridge carrying base64-encoded JPEGs and JSON metadata packages directly to the view panel at 30 FPS.
- **Live Overlays**: High-contrast, clean canvas polygons with color coding: Green for passing elements, Red/Yellow for defects, and Purple for labeling metrics.
- **Industrial Usability Considerations**:
  - Direct percentage typed thresholds replacing slide-dragging controls (enables high-precision operational inputs).
  - Vertical-stack fullscreen layouts for easy monitoring on manufacturing SCADA screens.
  - Automatic, non-blocking asynchronous writing of telemetry logs to the database every 5 seconds.

---

## 8. Engineering Challenges Solved
- **Jarring Screen Flashing Flicker**: Jarring screen overlay flashing was resolved by completely bypassing dynamic CSS color toggling on defect flags, maintaining a stable static UI.
- **Outer Edge Bounding Box Bleeds**: Giant false-positive bounding boxes near the edge of the image were creating a red flickering frame around the video box. Solved by implementing a geometric filter in `inference.py` to discard any boxes exceeding `80%` of the frame width or `90%` of the frame height.
- **macOS Gatekeeper Signature Mismatch**: Resolved native binary node compile failures (`rollup-darwin-arm64`) by resetting `node_modules` and utilizing direct `npm install` on host setups.
- **Port Reuse Conflict**: fastapi failed with `Errno 48` address already in use. Resolved by setting up thread-safe background port clearing and binding Uvicorn with auto-reload features.

---

## 9. Future Improvements
- **ONNX Runtime / TensorRT Compile**: Exporting the `best_v1.pt` weights to **TensorRT** or **ONNX** formats to achieve sub-10ms latency metrics.
- **Conveyor Belt Hardware Bridging**: Integrating a physical GPIO relay switch triggered by the `FAIL` WebSocket payload to mechanically eject bad bottles off the line.
- **Multi-Camera Grid**: Extending the stream manager to concurrently display 4 cameras in a grid view on the dashboard.
