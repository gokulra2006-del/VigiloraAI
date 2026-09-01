import re
from typing import Dict, Any, Tuple
from pydantic import BaseModel

class ParsedCommand(BaseModel):
    transcript: str
    intent: str
    target: str = None
    confidence: float
    risk_level: str = "LOW"
    simulation: bool = True
    confirmation_required: bool = False

def parse_voice_command(transcript: str) -> ParsedCommand:
    """
    Parses natural language transcript into a structured security intent.
    Uses basic keyword and regex matching to act as the intent engine.
    """
    text = transcript.lower().strip()
    
    # Defaults
    intent = "UNKNOWN"
    target = None
    confidence = 0.0
    risk_level = "LOW"
    confirmation_required = False
    
    # 1. RUN_PLAYBOOK / SIMULATE_ACTION
    if "run" in text or "simulate" in text:
        if "ransomware" in text:
            intent = "RUN_PLAYBOOK"
            target = "RANSOMWARE-CONTAINMENT"
            confidence = 0.94
            risk_level = "HIGH"
            confirmation_required = True
        elif "isolation" in text or "isolate" in text:
            intent = "ISOLATE_ENDPOINT"
            target = "ENDPOINT-042" # Mock target extraction
            confidence = 0.89
            risk_level = "CRITICAL"
            confirmation_required = True
            
    # 2. VIEW / NAVIGATION COMMANDS
    elif "show" in text or "open" in text or "view" in text:
        if "threat" in text and "critical" in text:
            intent = "VIEW_THREATS"
            confidence = 0.95
        elif "watchlist" in text:
            intent = "VIEW_WATCHLIST"
            confidence = 0.92
        elif "soar" in text:
            intent = "NAVIGATE"
            target = "/soar"
            confidence = 0.98
        elif "incident" in text:
            intent = "VIEW_INCIDENTS"
            confidence = 0.90
        elif "map" in text or "intelligence" in text:
            intent = "NAVIGATE"
            target = "/threats"
            confidence = 0.95

    # 3. ANALYSIS COMMANDS
    elif "analyze" in text or "explain" in text or "summarize" in text or "what" in text or "which" in text:
        if "region" in text and "risk" in text:
            intent = "VIEW_REGION_RISK"
            confidence = 0.96
        elif "incident" in text:
            intent = "ANALYZE_INCIDENT"
            confidence = 0.88
        elif "situation" in text or "status" in text:
            intent = "ANALYZE_SITUATION"
            confidence = 0.91

    # Fallback if no specific match but confidence is somewhat there
    if intent == "UNKNOWN":
        confidence = 0.20
        
    return ParsedCommand(
        transcript=transcript,
        intent=intent,
        target=target,
        confidence=confidence,
        risk_level=risk_level,
        simulation=True, # Hackathon demo always runs in simulation for safety
        confirmation_required=confirmation_required
    )
