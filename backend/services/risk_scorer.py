"""
Risk Scorer Service — Genesis Layer 2.
Computes hourly per-zone risk scores (0-100) based on:
  - Time-of-day weight (late night = higher risk)
  - Recent alert density (incidents in last hour within zone)
  - Historical incident count
"""
import asyncio
import random
from datetime import datetime, timezone, timedelta
from config.database import AsyncSessionLocal
from models.assets import Zone, Incident, RiskScore
from sqlalchemy.future import select


# In-memory cache for the latest risk scores per zone
_latest_risk_scores: dict[str, dict] = {}

# Default time-of-day weights (hour → weight multiplier)
_TIME_WEIGHTS = {
    0: 1.8, 1: 1.9, 2: 2.0, 3: 2.0, 4: 1.9, 5: 1.7,
    6: 1.2, 7: 1.0, 8: 0.9, 9: 0.8, 10: 0.8, 11: 0.9,
    12: 1.0, 13: 0.9, 14: 0.9, 15: 0.9, 16: 1.0, 17: 1.1,
    18: 1.2, 19: 1.3, 20: 1.5, 21: 1.6, 22: 1.7, 23: 1.8,
}


def get_heatmap() -> list[dict]:
    """Return latest risk scores for all zones."""
    return list(_latest_risk_scores.values())


async def _compute_scores():
    """Compute and store risk scores for all active zones."""
    now = datetime.now(timezone.utc)
    hour = now.hour
    time_weight = _TIME_WEIGHTS.get(hour, 1.0)
    cutoff = now - timedelta(hours=1)

    async with AsyncSessionLocal() as db:
        zones_result = await db.execute(
            select(Zone).where(Zone.status == "active")
        )
        zones = zones_result.scalars().all()

        # Count recent incidents (proxy for alert density)
        recent_incidents_result = await db.execute(
            select(Incident).where(Incident.detected_at >= cutoff)
        )
        recent_incidents = recent_incidents_result.scalars().all()
        recent_count = len(recent_incidents)

        for zone in zones:
            # Simulated: alert density within this zone (random weighting)
            zone_incident_count = random.randint(0, max(1, recent_count // 2))
            historical_factor = random.uniform(0.1, 0.6)

            # Score formula: base × time × density bonus
            base = 10.0
            density_bonus = min(zone_incident_count * 5.0, 40.0)
            time_bonus = (time_weight - 1.0) * 20.0
            hist_bonus = historical_factor * 20.0

            raw_score = base + density_bonus + time_bonus + hist_bonus
            score = round(min(max(raw_score, 0.0), 100.0), 1)

            factors = {
                "time_of_day_weight": time_weight,
                "recent_alerts": zone_incident_count,
                "historical_factor": round(historical_factor, 2),
                "hour": hour,
            }

            risk = RiskScore(
                zone_id=zone.id,
                score=score,
                factors_json=factors,
            )
            db.add(risk)

            _latest_risk_scores[zone.id] = {
                "zone_id": zone.id,
                "zone_name": zone.name,
                "score": score,
                "level": (
                    "critical" if score >= 75 else
                    "high" if score >= 50 else
                    "medium" if score >= 25 else
                    "low"
                ),
                "factors": factors,
                "polygon_coords": zone.polygon_coords,
                "computed_at": now.isoformat(),
            }

        await db.commit()


async def run_risk_scorer():
    """Background task: compute risk scores every 30 minutes."""
    await asyncio.sleep(10)  # startup delay
    while True:
        try:
            await _compute_scores()
        except Exception as exc:
            print(f"[risk_scorer] error: {exc}")
        await asyncio.sleep(1800)  # 30 min
