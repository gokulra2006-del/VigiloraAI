import asyncio
import os
import shutil
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

# We have to fix python path for importing from parent dir if run standalone
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.assets import Camera
from config.database import AsyncSessionLocal

UCF_CRIME_SIMULATED_VIDEOS = [
    {
        "name": "UCF-Robbery-Cam-1",
        "type": "video_file",
        "url": "sample_video.mp4", # Fallback to our existing test file
        "lat": 40.7180,
        "lng": -74.0040,
        "anomaly": "robbery"
    },
    {
        "name": "UCF-Assault-Cam-2",
        "type": "video_file",
        "url": "sample_video.mp4",
        "lat": 40.7120,
        "lng": -73.9980,
        "anomaly": "assault"
    }
]

async def ingest():
    print("Ingesting UCF-Crime dataset cameras...")
    async with AsyncSessionLocal() as db:
        from models.assets import Incident
        
        for v in UCF_CRIME_SIMULATED_VIDEOS:
            cam_id = str(uuid.uuid4())
            c = Camera(
                id=cam_id,
                name=v["name"],
                status="online",
                source_type="video_file",
                stream_url=v["url"],
                fps=30,
                resolution="1080p",
                is_enabled=True,
                location_lat=v["lat"],
                location_lng=v["lng"],
                active_models=["yolo_v8", "ucf_anomaly"],
                created_at=datetime.now(timezone.utc)
            )
            db.add(c)
            
            from services.explainability import generate_incident_justification
            
            # Create a mock critical incident
            inc = Incident(
                id=str(uuid.uuid4()),
                type=f"Detected {v['anomaly']} on {v['name']}",
                severity="critical",
                status="open",
                camera_id=cam_id,
                description="Simulated UCF-Crime anomaly baseline.",
                detected_at=datetime.now(timezone.utc)
            )
            inc.justification_text = generate_incident_justification(inc)
            db.add(inc)
            
        await db.commit()
    print("Done ingesting dataset!")

if __name__ == "__main__":
    asyncio.run(ingest())
