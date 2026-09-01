from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
import asyncio
from config.database import get_db
from models.assets import VoiceCommandAudit
from services.command_parser import parse_voice_command, ParsedCommand
from services.playbook_engine import evaluate_event

router = APIRouter()

class TranscriptRequest(BaseModel):
    transcript: str

class ExecuteRequest(BaseModel):
    intent: str
    target: str = None
    transcript: str
    simulation: bool = True

class CommandResponse(BaseModel):
    status: str
    message: str
    action_log: list = []

@router.post("/parse", response_model=ParsedCommand)
async def parse_command(req: TranscriptRequest):
    """Parses a natural language transcript into an intent."""
    parsed = parse_voice_command(req.transcript)
    return parsed

@router.post("/execute", response_model=CommandResponse)
async def execute_command(req: ExecuteRequest, db: AsyncSession = Depends(get_db)):
    """Executes a parsed and confirmed command."""
    
    # 1. Audit Log Creation
    audit = VoiceCommandAudit(
        user="Operator",
        transcript=req.transcript,
        intent=req.intent,
        target=req.target,
        authorization_result="APPROVED",
        confirmation_result="CONFIRMED",
        execution_result="PENDING",
        mode="SIMULATION" if req.simulation else "REAL"
    )
    db.add(audit)
    
    action_log = []
    message = ""
    
    try:
        if req.intent == "RUN_PLAYBOOK":
            # For demonstration, we simulate triggering the SOAR playbook.
            # In a real app, we might fire `evaluate_event` with a manual trigger.
            # For demo purposes, we will return a simulated action log.
            await asyncio.sleep(1) # simulate execution delay
            action_log = [
                "Threat detected",
                "Playbook matched",
                "Endpoint isolated",
                "Sessions revoked",
                "Indicator blocked",
                "Incident created",
                "SOC notified"
            ]
            message = "Ransomware response simulation completed successfully. The endpoint was isolated and sessions revoked."
            audit.execution_result = "SUCCESS"
            
        elif req.intent == "ANALYZE_SITUATION":
            message = "Current security overview: 32 active threats, 5 critical incidents. Global risk trend is up 18%."
            audit.execution_result = "SUCCESS"
            
        elif req.intent == "VIEW_REGION_RISK":
            message = "Chennai currently has the highest estimated risk at 87% for the selected prediction window. The model indicates increasing activity driven primarily by credential attacks."
            audit.execution_result = "SUCCESS"
            
        else:
            message = f"Simulated execution of intent: {req.intent}."
            audit.execution_result = "SUCCESS"
            
    except Exception as e:
        audit.execution_result = "FAILED"
        message = str(e)
        
    await db.commit()
    
    return CommandResponse(
        status=audit.execution_result,
        message=message,
        action_log=action_log
    )

@router.get("/history")
async def get_command_history(db: AsyncSession = Depends(get_db)):
    """Fetches voice command audit history."""
    result = await db.execute(select(VoiceCommandAudit).order_by(VoiceCommandAudit.timestamp.desc()).limit(50))
    audits = result.scalars().all()
    return audits

@router.get("/status")
async def get_status():
    """Returns the subsystem status for the command center HUD."""
    return {
        "NOVA": "ONLINE",
        "VOICE_ENGINE": "READY",
        "SOAR": "ONLINE",
        "VISION_AI": "ONLINE",
        "WATCHLIST": "ONLINE",
        "THREAT_INTELLIGENCE": "ONLINE",
        "DATABASE": "CONNECTED"
    }

@router.post("/demo")
async def start_demo_sequence():
    """Returns the sequence of commands to execute for the hackathon presentation."""
    return {
        "sequence": [
            {"delay": 2000, "type": "VOICE", "text": "Nova, analyze the current security situation."},
            {"delay": 2000, "type": "RESPONSE", "intent": "ANALYZE_SITUATION"},
            {"delay": 4000, "type": "VOICE", "text": "Nova, which region is most at risk?"},
            {"delay": 2000, "type": "RESPONSE", "intent": "VIEW_REGION_RISK"},
            {"delay": 4000, "type": "VOICE", "text": "Nova, run the ransomware response simulation."},
            {"delay": 2000, "type": "CONFIRMATION"},
            {"delay": 2000, "type": "EXECUTE", "intent": "RUN_PLAYBOOK"}
        ]
    }
