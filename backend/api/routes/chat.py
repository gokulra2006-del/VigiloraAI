"""
Sentinel-AI Chat Assistant API
================================
Provides a conversational interface for operators to query
the platform's live data using natural language.

Uses a context-aware rule engine (instant, no LLM required)
that reads real data from the database, with optional Ollama
integration for open-ended questions.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc

from config.database import get_db
from models.assets import Incident, Camera, SecurityEvent, ThreatIntel, TrafficMetric, VisionIncident, Playbook, PlaybookExecution
from security.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Schemas ──────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # 'user' | 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str
    data: dict | None = None   # optional structured data to render in the UI


# ── Context Builder ───────────────────────────────────────────────────────────

async def _build_context(db: AsyncSession) -> dict:
    """Pull a compact snapshot of the platform state from the DB."""
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)

    # Incidents
    inc_result = await db.execute(
        select(Incident).order_by(desc(Incident.detected_at)).limit(100)
    )
    incidents = inc_result.scalars().all()

    open_incidents = [i for i in incidents if i.status not in ("resolved", "closed")]
    critical_incidents = [i for i in open_incidents if i.severity in ("critical", "high")]
    recent_incidents = [i for i in incidents if i.detected_at and i.detected_at.replace(tzinfo=timezone.utc) >= day_ago]

    # Cameras
    cam_result = await db.execute(select(Camera))
    cameras = cam_result.scalars().all()
    online_cams = [c for c in cameras if c.status == "online"]
    offline_cams = [c for c in cameras if c.status == "offline"]

    # Security Events
    evt_result = await db.execute(
        select(SecurityEvent).order_by(desc(SecurityEvent.timestamp)).limit(20)
    )
    events = evt_result.scalars().all()
    unresolved_events = [e for e in events if not e.is_resolved]

    # Threats
    threat_result = await db.execute(
        select(ThreatIntel).where(ThreatIntel.status == "active").limit(5)
    )
    threats = threat_result.scalars().all()

    # Vision AI Incidents
    vision_result = await db.execute(
        select(VisionIncident).order_by(desc(VisionIncident.created_at)).limit(3)
    )
    vision_incidents = vision_result.scalars().all()

    # SOAR Executions
    soar_result = await db.execute(
        select(PlaybookExecution).order_by(desc(PlaybookExecution.executed_at)).limit(3)
    )
    soar_executions = soar_result.scalars().all()

    return {
        "total_incidents": len(incidents),
        "open_incidents": len(open_incidents),
        "critical_incidents": len(critical_incidents),
        "recent_incidents_24h": len(recent_incidents),
        "recent_incident_types": list({i.type for i in recent_incidents}),
        "total_cameras": len(cameras),
        "online_cameras": len(online_cams),
        "offline_cameras": len(offline_cams),
        "offline_camera_names": [c.name for c in offline_cams],
        "unresolved_security_events": len(unresolved_events),
        "active_threats": len(threats),
        "top_threats": [{"id": t.id, "title": t.title, "cvss": t.cvss} for t in threats],
        "vision_incidents": [
            {
                "id": vi.id,
                "title": vi.incident_title,
                "threat_level": vi.threat_level,
                "threat_score": vi.threat_score,
                "confidence": vi.confidence,
                "sector": vi.sector,
                "camera_name": vi.camera_name,
                "summary": vi.summary,
                "recommended_actions": vi.recommended_actions_json or [],
            }
            for vi in vision_incidents
        ],
        "soar_executions": [
            {
                "id": se.id,
                "playbook_id": se.playbook_id,
                "playbook_name": se.playbook.name if se.playbook else "Security Response Playbook",
                "trigger_event": se.trigger_event,
                "trigger_ref_id": se.trigger_ref_id,
                "actions_taken": se.actions_taken or [],
                "justification": se.justification_text,
                "executed_at": se.executed_at.strftime("%H:%M:%S") if se.executed_at else "Recently",
            }
            for se in soar_executions
        ],
        "latest_incidents": [
            {
                "id": i.id,
                "type": i.type,
                "severity": i.severity if isinstance(i.severity, str) else i.severity.value,
                "status": i.status if isinstance(i.status, str) else i.status.value,
                "camera_id": i.camera_id,
                "detected_at": i.detected_at.isoformat() if i.detected_at else None,
            }
            for i in incidents[:5]
        ],
    }


# ── Intent Classifier + Rule Engine ──────────────────────────────────────────

def _classify_intent(msg: str) -> str:
    msg = msg.lower()
    if any(w in msg for w in ["soar", "playbook", "ransomware", "containment", "what happened to the", "automated response", "isolated"]):
        return "soar"
    if any(w in msg for w in ["vision", "visual", "cctv frame", "detected in sector", "what did vision", "what should the operator"]):
        return "vision"
    if any(w in msg for w in ["incident", "alert", "event", "intrusion", "parking"]):
        return "incidents"
    if any(w in msg for w in ["camera", "feed", "stream", "offline", "online"]):
        return "cameras"
    if any(w in msg for w in ["threat", "cve", "vulnerability", "cisa"]):
        return "threats"
    if any(w in msg for w in ["traffic", "vehicle", "pedestrian", "speed"]):
        return "traffic"
    if any(w in msg for w in ["security event", "brute force", "soc", "anomal"]):
        return "security_events"
    if any(w in msg for w in ["status", "health", "summary", "overview", "how is", "what is"]):
        return "summary"
    if any(w in msg for w in ["help", "what can", "capability", "feature"]):
        return "help"
    return "general"


def _generate_rule_reply(intent: str, ctx: dict, msg: str) -> tuple[str, dict | None]:
    """Generate a data-driven reply without an LLM."""

    if intent == "soar":
        soar_list = ctx.get("soar_executions", [])
        if not soar_list:
            return "No automated SOAR playbook executions recorded yet. Run a live threat simulation in **SOAR Engine** (`/soar`) to trigger defensive containment.", None
        latest = soar_list[0]
        acts = "\n".join([f"  • {a.get('label') or a.get('action')}" for a in latest["actions_taken"]]) or "  • Simulated endpoint isolation and session revocation."
        reply = (
            f"**Autonomous SOAR Playbook Execution:** `{latest['playbook_name']}`\n\n"
            f"- **Trigger Event**: `{latest['trigger_event']}` (Ref: `{latest['trigger_ref_id']}`)\n"
            f"- **Executed Actions ({len(latest['actions_taken'])} steps):**\n{acts}\n\n"
            f"- **Security State**: Threat contained, affected hosts isolated, credentials revoked, and SOC audit log archived.\n\n"
            f"Open **SOAR Engine** (`/soar`) to view execution timelines, terminal logs, and manage approval queues."
        )
        return reply, {"type": "soar", "execution": latest}

    if intent == "vision":
        vision_list = ctx.get("vision_incidents", [])
        if not vision_list:
            return "No Vision AI frame analyses recorded yet. Upload a CCTV frame in **Vision AI** to perform multimodal threat detection.", None
        latest = vision_list[0]
        actions_str = "\n".join([f"  {idx+1}. {act}" for idx, act in enumerate(latest["recommended_actions"])]) or "  1. Verify live camera stream."
        reply = (
            f"**Vision AI Threat Analysis Dossier: `{latest['id']}`**\n\n"
            f"- **Threat Level**: `{latest['threat_level']}` ({latest['threat_score']:.1f}% Risk Score | {latest['confidence']*100:.0f}% Confidence)\n"
            f"- **Location**: {latest['sector']} ({latest['camera_name']})\n"
            f"- **Executive Summary**: {latest['summary']}\n\n"
            f"**Recommended Operator Actions:**\n{actions_str}\n\n"
            f"Navigate to **Vision AI** (`/vision-ai`) for full forensic timelines and visual bounding annotations."
        )
        return reply, {"type": "vision", "vision_incident": latest}

    if intent == "summary":
        status = "NORMAL"
        if ctx["critical_incidents"] > 0:
            status = "CRITICAL"
        elif ctx["open_incidents"] > 3 or ctx["offline_cameras"] > 0:
            status = "ELEVATED"

        reply = f"""**System Status: {status}**

Here's your platform snapshot right now:

- **Incidents**: {ctx['open_incidents']} open ({ctx['critical_incidents']} critical/high) — {ctx['recent_incidents_24h']} in the last 24h
- **Cameras**: {ctx['online_cameras']}/{ctx['total_cameras']} online"""
        if ctx["offline_cameras"] > 0:
            reply += f" — ⚠️ {ctx['offline_cameras']} offline: {', '.join(ctx['offline_camera_names'])}"
        reply += f"\n- **Security Events**: {ctx['unresolved_security_events']} unresolved"
        reply += f"\n- **Active Threats (CISA KEV)**: {ctx['active_threats']}"
        return reply, {"type": "summary", "status": status, **ctx}

    if intent == "incidents":
        if ctx["open_incidents"] == 0:
            return "All clear — no open incidents at the moment.", None
        reply = f"You have **{ctx['open_incidents']} open incidents**, {ctx['critical_incidents']} of which are critical or high severity.\n\n**Latest 5:**\n"
        for inc in ctx["latest_incidents"]:
            sev_emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(inc["severity"], "⚪")
            reply += f"- {sev_emoji} `{inc['type']}` — {inc['severity'].upper()} ({inc['status']}) on `{inc['camera_id'] or 'unknown'}`\n"
        reply += "\nNavigate to **Incidents** for full details and to triage."
        return reply, {"type": "incidents", "incidents": ctx["latest_incidents"]}

    if intent == "cameras":
        if ctx["offline_cameras"] == 0:
            reply = f"All **{ctx['total_cameras']} cameras** are online and streaming."
        else:
            reply = (
                f"**{ctx['online_cameras']}/{ctx['total_cameras']} cameras online**.\n\n"
                f"⚠️ **{ctx['offline_cameras']} offline**: {', '.join(ctx['offline_camera_names'])}\n\n"
                "Check the **Live Feed** page to inspect and reconnect."
            )
        return reply, {"type": "cameras", "online": ctx["online_cameras"], "offline": ctx["offline_cameras"]}

    if intent == "threats":
        if ctx["active_threats"] == 0:
            return "No active CISA KEV threats are currently tracked in the database.", None
        reply = f"**{ctx['active_threats']} active threat(s)** from the CISA Known Exploited Vulnerabilities feed:\n\n"
        for t in ctx["top_threats"]:
            cvss = f"CVSS {t['cvss']:.1f}" if t.get("cvss") else "CVSS N/A"
            reply += f"- `{t['id']}` — {t['title']} ({cvss})\n"
        reply += "\nSee the **Threats** page for remediation guidance."
        return reply, {"type": "threats", "threats": ctx["top_threats"]}

    if intent == "help":
        reply = (
            "I'm your **VIGILORA AI Assistant**. You can ask me:\n\n"
            "- *What's the current system status?*\n"
            "- *How many open incidents are there?*\n"
            "- *Are any cameras offline?*\n"
            "- *Show me the latest incidents*\n"
            "- *What threats are active?*\n"
            "- *Any brute force events?*\n"
            "- *What's the traffic situation?*"
        )
        return reply, None

    # fallback
    reply = (
        f"I can see your platform has **{ctx['open_incidents']} open incidents** and "
        f"**{ctx['online_cameras']}/{ctx['total_cameras']} cameras online**. "
        "Ask me about incidents, cameras, threats, or security events for more detail."
    )
    return reply, None


# ── Optional Ollama integration ───────────────────────────────────────────────

async def _query_ollama(message: str, ctx: dict, history: list[ChatMessage]) -> str | None:
    """Try to get a response from local Ollama. Returns None if unavailable."""
    try:
        import aiohttp
        system_prompt = f"""You are VIGILORA AI Assistant, an expert security operations AI embedded in the VIGILORA AI surveillance platform.
Current platform state:
- Open incidents: {ctx['open_incidents']} ({ctx['critical_incidents']} critical)
- Cameras online: {ctx['online_cameras']}/{ctx['total_cameras']}
- Offline cameras: {ctx.get('offline_camera_names', [])}
- Unresolved security events: {ctx['unresolved_security_events']}
- Active CISA threats: {ctx['active_threats']}
- Recent incident types (24h): {ctx['recent_incident_types']}

Respond concisely using markdown. Stay focused on security operations."""

        messages = [{"role": "system", "content": system_prompt}]
        for m in history[-6:]:  # last 3 turns
            messages.append({"role": m.role, "content": m.content})
        messages.append({"role": "user", "content": message})

        async with aiohttp.ClientSession() as session:
            async with session.post(
                "http://localhost:11434/api/chat",
                json={"model": "llama3.2", "messages": messages, "stream": False},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("message", {}).get("content")
    except Exception as exc:
        logger.debug(f"Ollama not available: {exc}")
    return None


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/message", response_model=ChatResponse)
async def chat_message(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Process a chat message and return an intelligent response via Nova."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    ctx = await _build_context(db)
    
    from services.nova_agent import handle_chat
    reply = await handle_chat(req.message, req.history, ctx)
    
    return ChatResponse(reply=reply, data=None)
