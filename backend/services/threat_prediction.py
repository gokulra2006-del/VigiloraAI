import json
import random
from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from models.assets import ThreatPrediction, Incident

def calculate_baseline_risk(incidents: List[Incident]) -> int:
    """Calculate a baseline risk score (0-100) based on recent incidents."""
    if not incidents:
        return 0
    
    score = 0
    for inc in incidents:
        if inc.severity == "critical":
            score += 25
        elif inc.severity == "high":
            score += 15
        elif inc.severity == "medium":
            score += 5
        else:
            score += 2
            
    # Trend weight based on frequency
    if len(incidents) > 10:
        score += 20
    elif len(incidents) > 5:
        score += 10
        
    return min(100, score)

async def generate_predictive_demo(db: AsyncSession) -> List[Dict[str, Any]]:
    """Runs the 10-15s demo sequence generating mock telemetry for high-risk regions."""
    regions = [
        {"name": "Chennai", "lat": 13.0827, "lng": 80.2707, "base_risk": 87, "threats": ["Credential Attack", "Network Intrusion"]},
        {"name": "Mumbai", "lat": 19.0760, "lng": 72.8777, "base_risk": 82, "threats": ["Ransomware", "Data Exfiltration"]},
        {"name": "Singapore", "lat": 1.3521, "lng": 103.8198, "base_risk": 79, "threats": ["Malware", "Phishing"]},
        {"name": "London", "lat": 51.5074, "lng": -0.1278, "base_risk": 73, "threats": ["Brute Force"]},
        {"name": "New York", "lat": 40.7128, "lng": -74.0060, "base_risk": 69, "threats": ["Physical Security", "Network Intrusion"]},
        {"name": "Dubai", "lat": 25.2048, "lng": 55.2708, "base_risk": 54, "threats": ["Insider Threat"]},
        {"name": "Bengaluru", "lat": 12.9716, "lng": 77.5946, "base_risk": 48, "threats": ["Credential Attack"]},
    ]
    
    predictions = []
    for r in regions:
        # Add some jitter to make it look calculated
        jitter = random.randint(-5, 5)
        current = max(10, r["base_risk"] - random.randint(5, 15))
        predicted = min(99, r["base_risk"] + jitter)
        confidence = random.randint(72, 94)
        
        trend = "INCREASING" if predicted > current + 5 else ("DECREASING" if predicted < current - 5 else "STABLE")
        
        features = [
            f"{random.randint(15, 45)}% increase in incidents over the last 24 hours",
            f"Elevated {r['threats'][0].lower()} activity",
            f"{random.randint(1, 5)} critical incidents recently observed",
            "Activity is above the historical baseline"
        ]
        
        prediction = ThreatPrediction(
            region=r["name"],
            lat=r["lat"],
            lng=r["lng"],
            current_risk=current,
            predicted_risk=predicted,
            confidence=confidence,
            trend=trend,
            threat_types=r["threats"],
            prediction_window="NEXT 24 HOURS",
            contributing_features=features
        )
        db.add(prediction)
        
        predictions.append({
            "region": r["name"],
            "lat": r["lat"],
            "lng": r["lng"],
            "current_risk": current,
            "predicted_risk": predicted,
            "confidence": confidence,
            "trend": trend,
            "threat_types": r["threats"],
            "prediction_window": "NEXT 24 HOURS",
            "contributing_features": features,
            "incident_count": random.randint(12, 45)
        })
        
    await db.commit()
    
    # Update Nova Context if applicable
    # We could theoretically post this to Nova's context, but returning it is enough for the UI.
    return sorted(predictions, key=lambda x: x["predicted_risk"], reverse=True)
