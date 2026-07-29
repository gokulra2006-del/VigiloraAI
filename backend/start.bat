@echo off
echo Starting Sentinel-ai Backend via uv...

if not exist uv.exe (
    echo uv.exe not found!
    pause
    exit /b 1
)

if not exist .venv (
    echo Creating virtual environment with standard Windows Python...
    .\uv.exe venv --python 3.12
)

echo Syncing dependencies...
.\uv.exe pip install -r requirements.txt

echo Starting Uvicorn...
call .venv\Scripts\activate.bat
python -m uvicorn main:app
pause
