# VIGILORA AI (Sentinel-ai)

**VIGILORA AI** is an enterprise-grade, autonomous visual monitoring and detection platform. Built for modern security operations, it combines state-of-the-art computer vision models with real-time alerting, automated playbooks, and a conversational AI assistant to proactively secure physical environments.

---

## Key Features & Modules

### Core Monitoring & Operations
*   **Dashboard:** Central command overview with high-level metrics, system health, and recent critical alerts.
*   **Live Feed:** Real-time, ultra-low latency video streaming with live AI bounding box overlays.
*   **GIS Map:** Spatial interface plotting camera placements and live incident markers.
*   **SOC Center:** A high-density view designed specifically for control room operators for rapid response.

### Artificial Intelligence & Detection
*   **OG AI (Nova):** A conversational AI assistant that queries system logs and analyzes incidents using natural language.
*   **Object Alerts (LIVE):** Continuous real-time feed tracking recognized objects (e.g., weapons, unauthorized vehicles) with confidence scores.
*   **AI Models:** Configuration center for computer vision engines (YOLOv8), sensitivity thresholds, and processing resources.
*   **Threat Intel:** Integrates external threat intelligence feeds to correlate internal physical security events.

### Investigation & Incident Management
*   **Case Board:** Kanban-style board for bundling related alerts into a single Case and tracking investigation progress.
*   **Incidents & Timeline:** Triage interface for managing escalated events and a chronological audit trail for forensic analysis.
*   **Watchlist:** Secure database for tracking license plates of unauthorized vehicles or facial recognition profiles.

### Automation & Administration
*   **Playbooks:** Automated response engine (SOAR workflows) for autonomous security actions without human intervention.
*   **Reports:** Intelligence hub for compiling and exporting official PDF dossiers and compliance logs.
*   **Cameras & Users:** Device registry for RTSP/webcam streams and Role-Based Access Control (RBAC) management.

---

## Tech Stack

### Frontend (Client & UI Architecture)
*   **React 19 & Vite 8:** Ultra-fast core UI library and build tool.
*   **Tailwind CSS 4:** Utility-first CSS framework for sleek, modern, and highly responsive styling.
*   **Framer Motion:** Powers smooth micro-animations and dynamic UI effects.
*   **React-Leaflet:** Engine behind the interactive GIS Map.
*   **React Query & Axios:** Handles robust, asynchronous data fetching and caching.

### Backend (Server, API & Database)
*   **FastAPI & Uvicorn:** Lightning-fast ASGI web server handling concurrent background tasks and streams.
*   **SQLAlchemy 2.0 & Alembic:** ORM for database interactions securely (supports SQLite/PostgreSQL).
*   **Pydantic:** Strictly enforces data validation and type hints.
*   **Passlib (Bcrypt) & Python-JOSE:** Enterprise-grade security and JSON Web Tokens (JWT) for authentication.

### AI & Computer Vision
*   **Ultralytics (YOLOv8):** SOTA machine learning model for live object detection (weapons, people, vehicles).
*   **OpenCV (Python Headless):** Core computer vision library for manipulating video frames and digital PTZ.
*   **Anthropic (Claude) API:** Powers the conversational AI assistant with advanced reasoning.

---

## Quick Start (Local Development)

### Prerequisites
- Node.js (for frontend)
- Python 3.11+ & `uv` package manager (for backend & detection)

### 1. Environment Setup
Create your local environment variables:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` is set appropriately in the `.env` file. For local testing without Docker, use SQLite:
`DATABASE_URL=sqlite+aiosqlite:///sentinelvision.db`

### 2. Running Locally (Windows)
We provide a convenient batch script to start all services (Backend, Frontend, and Detection Pipeline) simultaneously:
```cmd
start-all.bat
```

Alternatively, you can run them manually:

**Backend:**
```bash
cd backend
uv venv
uv pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The application will be available at:
- **Frontend Dashboard:** `http://localhost:5173`
- **Backend API Docs:** `http://localhost:8000/docs`

### 3. Demo Credentials
If the database was initialized cleanly, you can create a test user by running the backend shell or using the default seeded admin:
- **Username:** `admin`
- **Password:** `password123`

---

## Camera Simulation & RTSP Support

VIGILORA AI's detection engine supports multiple camera source types for simulation and testing.

| Source Type | Description | CLI Command (Detection Engine) |
|-------------|-------------|-------------|
| `real_hardware` | Standard live surveillance cameras | (Varies by deployment) |
| `rtsp_phone` | Simulated stream via phone IP Webcam | `--source rtsp --url rtsp://<ip>:<port>/h264_ulaw.sdp` |
| `video_file` | Simulated via local recorded video | `--source <path_to_video.mp4>` |
| `webcam` | Simulated via local laptop webcam | `--source 0` |

### Setting up a Phone as an RTSP Source
1. Download a free IP Webcam app (e.g., "IP Webcam" for Android or "EpocCam").
2. Start the server on the app to broadcast your phone camera on your local network.
3. Run the detection pipeline with the `--source rtsp` flag pointing to the provided IP.
