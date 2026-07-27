import asyncio
import random
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.assets import Camera, Incident, TrafficMetric
from config.database import AsyncSessionLocal
from api.routes.telemetry import manager
import uuid

logger = logging.getLogger(__name__)

async def simulate_live_telemetry():
    """Background task to simulate live YOLO detections and Traffic."""
    logger.info("Starting live telemetry simulation...")
    
    # First, make sure there are some cameras in the database.
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Camera))
        cameras = result.scalars().all()
        
        if not cameras:
            logger.info("No cameras found. Seeding initial cameras...")
            cams = [
                Camera(id=f"cam-{i}", name=f"Camera {i}", status="online", location=loc, fps=30, resolution="1080p", active_models=["YOLOv8", "FaceNet"])
                for i, loc in enumerate(["Main Gate", "Perimeter North", "Lobby", "Loading Dock", "East Wing"], start=1)
            ]
            session.add_all(cams)
            await session.commit()
            cameras = cams

    while True:
        try:
            # Sleep for a random interval (e.g. 5-10 seconds)
            await asyncio.sleep(random.uniform(5.0, 10.0))
            
            async with AsyncSessionLocal() as session:
                # 1. Randomly generate a traffic metric
                traffic = TrafficMetric(
                    time=datetime.now().strftime("%H:%M"),
                    vehicles=random.randint(5, 50),
                    pedestrians=random.randint(0, 20),
                    avg_speed=random.uniform(15.0, 45.0)
                )
                session.add(traffic)

                await session.commit()
                
                # Broadcast via WebSockets
                await manager.broadcast({
                    "type": "TRAFFIC_UPDATE", 
                    "data": {
                        "vehicles": traffic.vehicles, 
                        "pedestrians": traffic.pedestrians, 
                        "avg_speed": traffic.avg_speed
                    }
                })
                
        except Exception as e:
            logger.error(f"Telemetry simulation error: {e}")
            await asyncio.sleep(5)
