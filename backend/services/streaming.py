import os
import subprocess
import logging
import asyncio
from pathlib import Path

logger = logging.getLogger(__name__)

# Directory to store HLS segments temporarily
STREAM_DIR = Path("streams")
STREAM_DIR.mkdir(exist_ok=True)

class StreamingEngine:
    def __init__(self):
        self.active_processes = {} # camera_id -> subprocess.Popen

    async def start_stream(self, camera_id: str, source_url: str):
        if camera_id in self.active_processes:
            logger.info(f"Stream for {camera_id} is already running.")
            return

        cam_dir = STREAM_DIR / camera_id
        cam_dir.mkdir(exist_ok=True)

        hls_path = cam_dir / "index.m3u8"

        command = [
            ".\\ffmpeg.exe",
            "-y", 
            "-fflags", "nobuffer",
            "-rtsp_transport", "tcp",
            "-i", source_url,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-tune", "zerolatency",
            "-c:a", "aac",
            "-f", "hls",
            "-hls_time", "2",
            "-hls_list_size", "5",
            "-hls_flags", "delete_segments",
            str(hls_path)
        ]

        logger.info(f"Starting FFmpeg for camera {camera_id}: {' '.join(command)}")
        
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL
            )
            self.active_processes[camera_id] = process
            logger.info(f"FFmpeg started for {camera_id} with PID {process.pid}")
        except Exception as e:
            logger.error(f"Failed to start stream for {camera_id}: {e}")

    async def stop_stream(self, camera_id: str):
        process = self.active_processes.pop(camera_id, None)
        if process:
            logger.info(f"Stopping stream for {camera_id}")
            try:
                process.terminate()
                await process.wait()
            except Exception as e:
                logger.error(f"Error terminating stream for {camera_id}: {e}")
                
            cam_dir = STREAM_DIR / camera_id
            if cam_dir.exists():
                for f in cam_dir.glob("*"):
                    try:
                        f.unlink()
                    except:
                        pass

    async def shutdown(self):
        for cam_id in list(self.active_processes.keys()):
            await self.stop_stream(cam_id)

stream_engine = StreamingEngine()
