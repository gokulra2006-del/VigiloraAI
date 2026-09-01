@echo off
echo Starting Sentinel-ai Enterprise Platform...
echo ===========================================

echo.
echo Starting Backend API Server...
start "Sentinel-ai Backend" cmd /k "cd backend && start.bat"

echo Starting Frontend Dashboard...
start "Sentinel-ai Frontend" cmd /k "cd frontend && npm run dev"

echo Starting AI Detection Pipeline (Webcam)...
start "Sentinel-ai AI Detection" cmd /k "cd detection && ..\backend\.venv\Scripts\python pipeline.py --source 0 --camera-id cam-1"

echo.
echo Servers are launching in separate windows!
echo.
echo [Frontend URL]  http://localhost:5173
echo [Backend API]   http://localhost:8000/docs
echo.
echo You can keep this window open or close it. The servers will continue running in their respective windows.
pause
