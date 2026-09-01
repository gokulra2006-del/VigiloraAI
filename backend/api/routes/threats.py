from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from config.database import get_db
from models.assets import ThreatIntel, ThreatPrediction, Incident
import random
from datetime import datetime, timezone, timedelta
from services.threat_prediction import generate_predictive_demo

router = APIRouter()

@router.get("/")
async def get_threats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ThreatIntel).order_by(ThreatIntel.created_at.desc()))
    return result.scalars().all()

@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)):
    """Global threat summary stats."""
    # Count of active incidents
    result = await db.execute(select(Incident).where(Incident.status == "open"))
    active = len(result.scalars().all())
    
    # Global threats
    result_global = await db.execute(select(ThreatIntel))
    global_threats = len(result_global.scalars().all())
    
    # High risk regions (from latest predictions)
    pred_result = await db.execute(select(ThreatPrediction).order_by(ThreatPrediction.created_at.desc()).limit(10))
    preds = pred_result.scalars().all()
    high_risk = sum(1 for p in preds if p.predicted_risk > 70)
    
    return {
        "global_threats": max(global_threats, 247), # Use baseline from prompt if empty
        "active_threats": max(active, 32),
        "high_risk_regions": high_risk or 8,
        "predicted_threats": 14,
        "risk_trend": "+18%"
    }

@router.get("/events")
async def get_events(limit: int = Query(50), db: AsyncSession = Depends(get_db)):
    """Live and historical event feed."""
    result = await db.execute(select(Incident).order_by(Incident.detected_at.desc()).limit(limit))
    incidents = result.scalars().all()
    
    events = []
    for inc in incidents:
        events.append({
            "id": str(inc.id),
            "timestamp": inc.detected_at.isoformat() if inc.detected_at else datetime.now(timezone.utc).isoformat(),
            "description": inc.description or f"{inc.type} detected",
            "region": "Chennai" if inc.severity == "critical" else "Local", # Mocking region for incidents if missing
            "severity": inc.severity,
            "type": inc.type
        })
        
    if not events:
        # Provide demo feed if db is empty
        now = datetime.now(timezone.utc)
        events = [
            {"id": "evt-1", "timestamp": (now - timedelta(minutes=2)).isoformat(), "description": "Network intrusion detected", "region": "Chennai", "severity": "critical", "type": "Network Intrusion"},
            {"id": "evt-2", "timestamp": (now - timedelta(minutes=5)).isoformat(), "description": "Credential attack detected", "region": "Mumbai", "severity": "high", "type": "Credential Attack"},
            {"id": "evt-3", "timestamp": (now - timedelta(minutes=10)).isoformat(), "description": "Malware detected", "region": "Singapore", "severity": "medium", "type": "Malware"}
        ]
        
    return events

@router.get("/predictions")
async def get_predictions(window: str = Query("NEXT 24 HOURS"), db: AsyncSession = Depends(get_db)):
    """Return calculated threat predictions per region."""
    # Group by region and get the latest prediction for each
    result = await db.execute(select(ThreatPrediction).order_by(ThreatPrediction.created_at.desc()).limit(20))
    all_preds = result.scalars().all()
    
    seen = set()
    latest_preds = []
    for p in all_preds:
        if p.region not in seen:
            seen.add(p.region)
            latest_preds.append({
                "id": p.id,
                "region": p.region,
                "lat": p.lat,
                "lng": p.lng,
                "current_risk": p.current_risk,
                "predicted_risk": p.predicted_risk,
                "confidence": p.confidence,
                "trend": p.trend,
                "threat_types": p.threat_types or [],
                "prediction_window": p.prediction_window,
                "contributing_features": p.contributing_features or [],
                "created_at": p.created_at.isoformat() if p.created_at else None
            })
            
    if not latest_preds:
        # Call generate_predictive_demo to populate if none exist
        return await generate_predictive_demo(db)
        
    return sorted(latest_preds, key=lambda x: x["predicted_risk"], reverse=True)

@router.get("/trends")
async def get_trends(db: AsyncSession = Depends(get_db)):
    """Threat activity timeline data."""
    # Mock trend data for the chart
    now = datetime.now(timezone.utc)
    return [
        {"time": (now - timedelta(hours=6)).strftime("%H:00"), "observed": 12, "predicted": None},
        {"time": (now - timedelta(hours=5)).strftime("%H:00"), "observed": 15, "predicted": None},
        {"time": (now - timedelta(hours=4)).strftime("%H:00"), "observed": 18, "predicted": None},
        {"time": (now - timedelta(hours=3)).strftime("%H:00"), "observed": 14, "predicted": None},
        {"time": (now - timedelta(hours=2)).strftime("%H:00"), "observed": 22, "predicted": None},
        {"time": (now - timedelta(hours=1)).strftime("%H:00"), "observed": 28, "predicted": None},
        {"time": "NOW", "observed": 32, "predicted": 32},
        {"time": (now + timedelta(hours=1)).strftime("%H:00"), "observed": None, "predicted": 38},
        {"time": (now + timedelta(hours=2)).strftime("%H:00"), "observed": None, "predicted": 45},
        {"time": (now + timedelta(hours=3)).strftime("%H:00"), "observed": None, "predicted": 42},
        {"time": (now + timedelta(hours=4)).strftime("%H:00"), "observed": None, "predicted": 36},
    ]

@router.post("/demo")
async def run_predictive_demo(db: AsyncSession = Depends(get_db)):
    """Execute the one-click predictive demo."""
    predictions = await generate_predictive_demo(db)
    
    # Inject into Nova Context
    try:
        from services.nova_agent import nova_engine
        if nova_engine:
            context_str = f"Predictive Threat Intel just identified High Risk regions: {', '.join([p['region'] for p in predictions[:3]])}. Top risk is {predictions[0]['region']} at {predictions[0]['predicted_risk']}% due to {predictions[0]['contributing_features'][0]}."
            nova_engine.inject_context(context_str)
    except Exception:
        pass
        
    return {"status": "success", "predictions": predictions}
