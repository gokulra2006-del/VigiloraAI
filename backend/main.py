from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.database import engine, Base, AsyncSessionLocal
from config.settings import settings
from api.routes import health, cameras, incidents, threats, traffic, dashboard, telemetry
from api.routes import auth, detections, security_events, alerting, chat, simulate
from api.routes import object_alerts, watchlist, anomaly, geofence, risk_scores, cases, playbooks, nova
from services.telemetry import simulate_live_telemetry
from services.threat_intel import fetch_cisa_kev_and_seed
from services.brute_force import detect_brute_force
from services.attack_noise import run_attack_noise_engine
from services.anomaly import run_anomaly_engine
from services.risk_scorer import run_risk_scorer
from services.case_bundler import run_case_bundler
from services.playbook_engine import run_playbook_engine
from services.daily_digest import run_daily_digest
from models.assets import User
from security.auth import get_password_hash
from sqlalchemy.future import select
from sqlalchemy import inspect, text
from fastapi.staticfiles import StaticFiles
import asyncio

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
os.makedirs("streams", exist_ok=True)
app.mount("/streams", StaticFiles(directory="streams"), name="streams")


def _apply_phase1_schema_migration(connection):
    """Add Phase 1 enrichment columns to databases created before SentinelVision.

    ``create_all`` intentionally does not alter existing tables.  This lightweight,
    additive migration keeps local SQLite demos and existing deployments working
    without dropping any incident history.
    """
    required = {
        "cameras": {"location": "VARCHAR(200)", "zone_id": "VARCHAR"},
        "incidents": {
            "justification_text": "TEXT", "correlation_group": "VARCHAR(64)",
            "autonomy_tier": "VARCHAR(30)", "approval_status": "VARCHAR(20)",
            "zone": "VARCHAR(100)", "source": "VARCHAR(20)", "model_confidence": "FLOAT",
        },
        "cases": {
            "notes": "TEXT", "closed_at": "DATETIME", "bundle_confidence": "FLOAT",
            "correlated_alert_count": "INTEGER", "affected_zones": "VARCHAR(300)",
            "resolution": "VARCHAR(30)", "time_to_resolve": "FLOAT",
        },
    }
    inspector = inspect(connection)
    for table, columns in required.items():
        existing = {column["name"] for column in inspector.get_columns(table)}
        for name, column_type in columns.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {column_type}"))

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
            await conn.run_sync(_apply_phase1_schema_migration)
    
    if settings.SEED_ADMIN:
        await seed_admin()
        
    # Start background tasks
    asyncio.create_task(simulate_live_telemetry())
    asyncio.create_task(fetch_cisa_kev_and_seed())
    asyncio.create_task(detect_brute_force())
    asyncio.create_task(run_attack_noise_engine())
    # Genesis pipeline services
    asyncio.create_task(run_anomaly_engine())
    asyncio.create_task(run_risk_scorer())
    asyncio.create_task(run_case_bundler())
    asyncio.create_task(run_playbook_engine())
    asyncio.create_task(run_daily_digest())

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

# Genesis routes
app.include_router(object_alerts.router, prefix="/api/v1/object-alerts", tags=["Object Alerts"])
app.include_router(watchlist.router, prefix="/api/v1/watchlist", tags=["Watchlist"])
app.include_router(anomaly.router, prefix="/api/v1/anomaly", tags=["Anomaly Detection"])
app.include_router(geofence.router, prefix="/api/v1/geofence", tags=["Geofence"])
app.include_router(risk_scores.router, prefix="/api/v1/risk-scores", tags=["Risk Scores"])
app.include_router(cases.router, prefix="/api/v1/cases", tags=["Cases"])
app.include_router(playbooks.router, prefix="/api/v1/playbooks", tags=["Playbooks"])
app.include_router(nova.router, prefix="/api/v1/nova", tags=["Nova AI"])
