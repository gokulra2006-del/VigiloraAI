import asyncio
import uuid
import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from config.database import engine, Base, AsyncSessionLocal
from models.assets import User, Camera, LoginAttempt, Incident
from models.enums import RoleEnum, IncidentStatusEnum, SeverityEnum
from security.auth import get_password_hash

async def seed():
    print("Starting Sentinel-ai Demo Seeder...")
    
    # 1. Ensure tables exist
    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as session:
        # 2. Seed Admin and Operator
        print("Seeding users...")
        for username, role in [("admin", RoleEnum.admin), ("operator", RoleEnum.operator)]:
            result = await session.execute(select(User).where(User.username == username))
            if not result.scalar_one_or_none():
                user = User(
                    username=username,
                    hashed_password=get_password_hash("password123"),
                    role=role
                )
                session.add(user)
                
        # 3. Seed Cameras
        print("Seeding cameras...")
        cameras_data = [
            {"id": "cam-1", "name": "Main Gate Cam", "location": "Sector 4, Entry Point", "source_type": "real_hardware", "status": "online"},
            {"id": "cam-2", "name": "Perimeter Drone", "location": "Sector 9, East Wall", "source_type": "rtsp_phone", "status": "online"},
            {"id": "cam-3", "name": "Warehouse Demo", "location": "Sector 2, Loading Bay", "source_type": "video_file", "status": "offline"},
            {"id": "cam-4", "name": "Lobby Webcam", "location": "Sector 1, Reception", "source_type": "webcam", "status": "online"},
        ]
        
        for cam_data in cameras_data:
            result = await session.execute(select(Camera).where(Camera.id == cam_data["id"]))
            if not result.scalar_one_or_none():
                camera = Camera(
                    id=cam_data["id"],
                    name=cam_data["name"],
                    location=cam_data["location"],
                    source_type=cam_data["source_type"],
                    status=cam_data["status"],
                    fps=30,
                    resolution="1080p",
                    active_models=["YOLOv8"]
                )
                session.add(camera)
            
        # 4. Simulate Brute Force Logins
        print("Simulating brute force attacks for SOC dashboard...")
        result = await session.execute(select(LoginAttempt).where(LoginAttempt.username == "operator"))
        if not result.scalars().first():
            # Create 10 failed logins exactly 2 minutes ago to trigger the brute force service
            now = datetime.datetime.now(datetime.timezone.utc)
            two_mins_ago = now - datetime.timedelta(minutes=2)
            
            for i in range(10):
                attempt = LoginAttempt(
                    username="operator",
                    success=False,
                    ip_address="192.168.1.100",
                    timestamp=two_mins_ago + datetime.timedelta(seconds=i*2)
                )
                session.add(attempt)
                
        # 5. Seed some incidents for demo purposes
        print("Seeding incidents...")
        cam_id = "cam-1"
        result = await session.execute(select(Incident))
        incidents = result.scalars().all()
        if not incidents:
            inc1 = Incident(
                camera_id=cam_id,
                type="Perimeter Breach",
                severity=SeverityEnum.critical.value,
                status=IncidentStatusEnum.detected.value,
                description="Person detected scaling the east wall."
            )
            inc2 = Incident(
                camera_id=cam_id,
                type="Loitering",
                severity=SeverityEnum.medium.value,
                status=IncidentStatusEnum.in_progress.value,
                description="Person loitering near back entrance for 5+ minutes.",
                detected_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1),
                acknowledged_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=55),
                in_progress_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=50),
            )
            session.add(inc1)
            session.add(inc2)
            await session.commit()
            
            # 6. Seed a Correlated Case
            print("Seeding a correlated case...")
            from models.assets import Case
            demo_case = Case(
                title="Correlated Perimeter Intrusion",
                status="open",
                severity="critical",
                summary="A loitering event followed by a perimeter breach was detected in Sector 4.",
                notes="AI identified multiple related events within a 120s correlation window.",
                bundle_confidence=92.5,
                correlated_alert_count=2,
                affected_zones="Sector 4"
            )
            session.add(demo_case)
            await session.commit()
            
            # Link incidents to case
            inc1.case_id = demo_case.id
            inc2.case_id = demo_case.id
            session.add(inc1)
            session.add(inc2)

        await session.commit()
        print("[OK] Seeding complete. You can now start the backend.")
        print("Users: admin/password123, operator/password123")

if __name__ == "__main__":
    asyncio.run(seed())
