# Sentinel-ai

Sentinel-ai is an enterprise-grade surveillance and monitoring platform. This repository is structured into an optimized, modular, and scalable clean architecture.

## Architecture

The project consists of three main components:
1. **Backend**: FastAPI based Clean Architecture RESTful API.
2. **Frontend**: React (Vite) application utilizing modern hooks, context, and atomic design principles.
3. **Detection**: Core AI pipeline for running detections.

## Prerequisites
- Docker & Docker Compose
- Node.js (for local frontend dev)
- Python 3.11+ (for local backend dev)

## Quick Start

1. **Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Modify `.env` as needed.

2. **Docker Compose**:
   To start the entire stack (Database, Backend, Frontend):
   ```bash
   docker-compose up -d --build
   ```

   The services will be available at:
   - Frontend: `http://localhost:80`
   - Backend API: `http://localhost:8000`
   - API Docs: `http://localhost:8000/docs`

## Camera Simulation & RTSP Support

Sentinel-ai's detection engine supports multiple camera source types for simulation and testing.

| Source Type | Description | CLI Command | UI Icon |
|-------------|-------------|-------------|---------|
| `real_hardware` | Standard live surveillance cameras | (Varies by deployment) | Standard Camera |
| `rtsp_phone` | Simulated stream via phone IP Webcam | `--source rtsp --url rtsp://<ip>:<port>/h264_ulaw.sdp` | Camera + Smartphone badge |
| `video_file` | Simulated via local recorded video | `--source <path_to_video.mp4>` | Camera + Film badge |
| `webcam` | Simulated via local laptop webcam | `--source 0` | Camera + Laptop badge |

### Setting up a Phone as an RTSP Source
To use a mobile phone as an RTSP source:
1. Download a free IP Webcam app (e.g., "IP Webcam" for Android or "EpocCam" / "Iriun").
2. Start the server on the app to broadcast your phone camera on your local network.
3. Note the IP address and port shown in the app.
4. Run the detection pipeline with the `--source rtsp` flag:
   ```bash
   python detection/pipeline.py --source rtsp --url rtsp://<YOUR_PHONE_IP>:<PORT>/h264_ulaw.sdp
   ```
*(Note: The exact stream path `/h264_ulaw.sdp` may vary depending on the app you use.)*

## Sub-components Documentation

Please refer to the READMEs in the respective directories for more detailed information on development workflows, linting, and architecture specifics:
- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
- [Detection Documentation](./detection/README.md)
