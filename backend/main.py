from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.database import engine, Base, AsyncSessionLocal
from config.settings import settings
from api.routes import health, cameras, incidents, threats, traffic, dashboard, telemetry
from api.routes import auth, detections, security_events, alerting, chat, simulate
from services.telemetry import simulate_live_telemetry
from services.threat_intel import fetch_cisa_kev_and_seed
from services.brute_force import detect_brute_force
from services.attack_noise import run_attack_noise_engine
from models.assets import User
from security.auth import get_password_hash
from sqlalchemy.future import select
import asyncio

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def seed_admin():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.username == settings.FIRST_ADMIN_USERNAME))
        if not result.scalar_one_or_none():
            admin = User(
                username=settings.FIRST_ADMIN_USERNAME,
                hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
                role="admin"
            )
            session.add(admin)
            await session.commit()

@app.on_event("startup")
async def startup_event():
    if settings.AUTO_CREATE_TABLES:
        from models import __init__  # Ensure models are imported
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    if settings.SEED_ADMIN:
        await seed_admin()
        
    # Start background tasks
    asyncio.create_task(simulate_live_telemetry())
    asyncio.create_task(fetch_cisa_kev_and_seed())
    asyncio.create_task(detect_brute_force())
    asyncio.create_task(run_attack_noise_engine())

app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(cameras.router, prefix="/api/v1/cameras", tags=["Cameras"])
app.include_router(detections.router, prefix="/api/v1/detections", tags=["Detections"])
app.include_router(incidents.router, prefix="/api/v1/incidents", tags=["Incidents"])
app.include_router(security_events.router, prefix="/api/v1/security-events", tags=["Security Events"])
app.include_router(threats.router, prefix="/api/v1/threats", tags=["Threats"])
app.include_router(traffic.router, prefix="/api/v1/traffic", tags=["Traffic"])
app.include_router(telemetry.router, prefix="/api/v1/telemetry", tags=["Telemetry"])
app.include_router(alerting.router, prefix="/api/v1/alerting", tags=["Alerting"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat Assistant"])
app.include_router(simulate.router, prefix="/api/v1/simulate", tags=["Attack Simulation"])

