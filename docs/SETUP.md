# SeeWise | Industrial Water Bottle Inspection Platform Setup Guide

Follow these quick instructions to spin up the SeeWise production-grade web inspection console on your local machine.

---

## 🛠️ Step 1 — Deployed Backend

The backend utilizes **FastAPI** for low-latency WebSocket image feeds, **SQLAlchemy** for scanning log archives, and **YOLOv8** for real-time item inspections.

1. Navigate to the `backend` workspace directory:
   ```bash
   cd backend
   ```

2. Scaffold a clean virtual environment and activate it:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required application packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Launch the FastAPI Uvicorn engine:
   ```bash
   python main.py
   ```
   *The server initializes on `http://localhost:8000`. The API documentations are served at `http://localhost:8000/docs`.*

---

## 💻 Step 2 — Premium Frontend

The dashboard is built on **Vite + React** backed by **Tailwind CSS v3**, **Framer Motion**, and **Recharts**.

1. Navigate to the `frontend` workspace directory:
   ```bash
   cd ../frontend
   ```

2. Retrieve node packages:
   ```bash
   npm install
   ```

3. Fire up the high-speed local dev engine:
   ```bash
   npm run dev
   ```
   *The web platform runs locally on `http://localhost:3000`.*

---

## 👁️ Step 3 — Inspection Operations

1. Point your web browser to `http://localhost:3000`.
2. Securely authenticate using our predefined operator credentials:
   - **Email:** `admin@seewise.com`
   - **Password:** `seewise123`
3. Head over to **Live Inspection** and toggle between:
   - **Laptop Webcam**
   - **Mobile IP Camera** (Android IP Webcam / DroidCam — see hotspot notes below)
   - **RTSP CCTV**
   - **Recorded Video Upload** (Supported formats: `.mp4`, `.mov`, `.avi`)
4. Trigger **Start Inspection** to witness the AI inspection neural network run, classify defects, save alerts, and feed details straight to the live KPI cards!
