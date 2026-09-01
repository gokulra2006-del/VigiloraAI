import asyncio
import random
import logging
import math
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.assets import Camera, Incident, TrafficMetric
from config.database import AsyncSessionLocal
from api.routes.telemetry import manager

logger = logging.getLogger(__name__)

# State for patrol vehicles (centered around NYC coordinates from map.tsx)
PATROLS = [
    {"id": "patrol-01", "name": "Patrol Unit 01", "lat": 40.7140, "lng": -74.0040, "speed": 0.0003, "heading": 45, "status": "En Route"},
    {"id": "patrol-02", "name": "Patrol Unit 02", "lat": 40.7200, "lng": -73.9900, "speed": 0.0002, "heading": 180, "status": "Patrolling"},
    {"id": "patrol-03", "name": "Drone 7", "lat": 40.7100, "lng": -74.0100, "speed": 0.0005, "heading": 300, "status": "Airborne"},
]

async def simulate_live_telemetry():
    """Background task to simulate live telemetry data."""
    logger.info("Starting live telemetry simulation (Traffic & Vehicles)...")
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Camera))
        cameras = result.scalars().all()
        
        if not cameras:
            cams = [
                Camera(id=f"cam-{i}", name=f"Camera {i}", status="online", location=loc, fps=30, resolution="1080p", active_models=["YOLOv8"])
                for i, loc in enumerate(["Main Gate", "Perimeter North", "Lobby", "Loading Dock", "East Wing"], start=1)
            ]
            session.add_all(cams)
            await session.commit()

    while True:
        try:
            await asyncio.sleep(1.5)
            
            # 1. Update vehicle positions based on heading and speed
            for p in PATROLS:
                # Randomly change heading slightly
                p["heading"] = (p["heading"] + random.uniform(-20, 20)) % 360
                
                # Calculate movement
                heading_rad = math.radians(p["heading"])
                p["lat"] += math.cos(heading_rad) * p["speed"]
                p["lng"] += math.sin(heading_rad) * p["speed"]
                
                # Keep them roughly bounded near NYC (40.70 to 40.73, -74.02 to -73.98)
                if p["lat"] > 40.73 or p["lat"] < 40.70: p["heading"] = (p["heading"] + 180) % 360
                if p["lng"] > -73.98 or p["lng"] < -74.02: p["heading"] = (p["heading"] + 180) % 360

            # Broadcast Vehicle Coordinates
            await manager.broadcast({
                "type": "VEHICLE_TELEMETRY", 
                "data": PATROLS
            })

            # 2. Occasional Traffic update
            if random.random() < 0.1:
                async with AsyncSessionLocal() as session:
                    traffic = TrafficMetric(
                        time=datetime.now().strftime("%H:%M"),
                        vehicles=random.randint(5, 50),
                        pedestrians=random.randint(0, 20),
                        avg_speed=random.uniform(15.0, 45.0)
                    )
                    session.add(traffic)
                    await session.commit()
                    
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

