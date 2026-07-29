import logging
import json
import anthropic
from config.settings import settings
from models.assets import Incident
from services.nova_notifications import nova_notifier

logger = logging.getLogger(__name__)

# The schema Nova must return for incidents
INCIDENT_ASSESSMENT_TOOL = {
    "name": "report_incident_assessment",
    "description": "Report a structured assessment and recommended actions for a security incident.",
    "input_schema": {
        "type": "object",
        "properties": {
            "severity": {
                "type": "string",
                "enum": ["critical", "high", "medium", "low"],
                "description": "The assessed severity of the incident."
            },
            "summary": {
                "type": "string",
                "description": "A one-line human-readable summary of the incident and threat level."
            },
            "recommended_actions": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Concrete steps the human operator should take."
            },
            "related_case_ids": {
                "type": "array",
                "items": {"type": "integer"},
                "description": "IDs of past related cases."
            },
            "requires_human_approval": {
                "type": "boolean",
                "description": "Whether the recommended actions require a human to approve (always true for actuating actions)."
            },
            "auto_actions_taken": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Actions Nova automatically executed (only for low severity/safe tasks)."
            }
        },
        "required": ["severity", "summary", "recommended_actions", "requires_human_approval", "auto_actions_taken"]
    }
}

async def handle_incident(incident: Incident):
    """
    Called synchronously by the alert_pipeline.
    Asks Nova to assess the incident and then dispatches notifications.
    """
    if not settings.ANTHROPIC_API_KEY:
        logger.warning("[Nova] No Anthropic API key set. Skipping LLM assessment, falling back to basic notification.")
        # Fallback assessment for testing without keys
        fallback = {
            "severity": incident.severity or "medium",
            "summary": f"Incident {incident.type} detected at {incident.zone or 'unknown zone'}.",
            "recommended_actions": ["Review camera feed manually."],
            "related_case_ids": [],
            "requires_human_approval": True,
            "auto_actions_taken": []
        }
        await nova_notifier.dispatch(fallback)
        return fallback

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    # In step 3, we will inject ChromaDB RAG context here
    prompt = f"""
    A new security incident has been detected. Assess the threat and recommend actions.
    
    ID: {incident.id}
    Type: {incident.type}
    Zone: {incident.zone or 'Unknown'}
    Initial Severity: {incident.severity}
    Description: {incident.description}
    Confidence: {incident.model_confidence}
    """

    try:
        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system="You are Nova, an expert AI security operator for SentinelVision. Your job is to assess incidents rapidly and output structured response plans.",
            messages=[
                {"role": "user", "content": prompt}
            ],
            tools=[INCIDENT_ASSESSMENT_TOOL],
            tool_choice={"type": "tool", "name": "report_incident_assessment"}
        )
        
        # Extract the tool call
        for block in response.content:
            if block.type == "tool_use" and block.name == "report_incident_assessment":
                assessment = block.input
                logger.info(f"[Nova] Assessed incident {incident.id} as {assessment.get('severity')}: {assessment.get('summary')}")
                
                # Dispatch real-time notifications
                await nova_notifier.dispatch(assessment)
                return assessment
                
    except Exception as e:
        logger.error(f"[Nova] handle_incident failed: {e}")
        
    return None

async def handle_chat(message: str, history: list, context: dict) -> str:
    """
    Called by the chat route. Sends a message to Nova (Anthropic) with platform context.
    """
    if not settings.ANTHROPIC_API_KEY:
        logger.warning("[Nova] No Anthropic API key set. Returning fallback chat response.")
        return "I am Nova, your AI assistant. (Anthropic API key is missing from `.env`, so I am running in fallback mode.)"

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    system_prompt = f"""You are Nova, an expert AI security operator embedded in SentinelVision.
You have access to live platform data. Be concise, professional, and use markdown formatting.

Current platform state:
- Open incidents: {context.get('open_incidents', 0)} ({context.get('critical_incidents', 0)} critical)
- Cameras online: {context.get('online_cameras', 0)}/{context.get('total_cameras', 0)}
- Active threats (CISA KEV): {context.get('active_threats', 0)}

When asked to perform actions, inform the user you can help them navigate but currently require explicit approval for actuating tasks."""

    # Format history for Anthropic
    anthropic_messages = []
    for msg in history:
        # History messages are typically dicts like {"role": "user", "content": "..."}
        role = msg.role if hasattr(msg, 'role') else msg.get('role', 'user')
        content = msg.content if hasattr(msg, 'content') else msg.get('content', '')
        # Anthropic only accepts "user" or "assistant"
        if role in ["user", "assistant"]:
            anthropic_messages.append({"role": role, "content": content})
            
    anthropic_messages.append({"role": "user", "content": message})

    try:
        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system=system_prompt,
            messages=anthropic_messages
        )
        return response.content[0].text
    except Exception as e:
        logger.error(f"[Nova] handle_chat failed: {e}")
        return f"Sorry, I encountered an error communicating with the AI backend: {e}"
