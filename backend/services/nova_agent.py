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
    Camera ID: {incident.camera_id or 'Unknown'}
    Detected At: {incident.detected_at}
    Initial Severity: {incident.severity}
    Description: {incident.description}
    Confidence: {incident.model_confidence}
    """

    try:
        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system="You are Nova, an expert AI security operator for VIGILORA AI. Your job is to assess incidents rapidly and output structured response plans.",
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

CHAT_TOOLS = [
    {
        "name": "get_open_incidents",
        "description": "Fetch a list of currently open incidents in the system.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Maximum number of incidents to return"}
            }
        }
    },
    {
        "name": "get_camera_status",
        "description": "Fetch the status of all registered cameras.",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "resolve_incident",
        "description": "Mark an incident as resolved.",
        "input_schema": {
            "type": "object",
            "properties": {
                "incident_id": {"type": "string", "description": "The ID of the incident to resolve"}
            },
            "required": ["incident_id"]
        }
    }
]

async def execute_tool(tool_name: str, tool_input: dict) -> str:
    from config.database import AsyncSessionLocal
    from sqlalchemy.future import select
    from models.assets import Incident, Camera
    import json
    
    async with AsyncSessionLocal() as db:
        if tool_name == "get_open_incidents":
            limit = tool_input.get("limit", 10)
            result = await db.execute(select(Incident).where(Incident.status.notin_(["resolved", "closed"])).limit(limit))
            incidents = result.scalars().all()
            return json.dumps([{"id": i.id, "type": i.type, "severity": i.severity, "zone": i.zone, "status": i.status} for i in incidents])
            
        elif tool_name == "get_camera_status":
            result = await db.execute(select(Camera))
            cameras = result.scalars().all()
            return json.dumps([{"id": c.id, "name": c.name, "status": c.status, "zone": c.zone_id} for c in cameras])
            
        elif tool_name == "resolve_incident":
            incident_id = tool_input.get("incident_id")
            result = await db.execute(select(Incident).where(Incident.id == incident_id))
            incident = result.scalar_one_or_none()
            if not incident:
                return f"Error: Incident {incident_id} not found."
            incident.status = "resolved"
            await db.commit()
            return f"Success: Incident {incident_id} has been marked as resolved."
            
        return f"Error: Tool {tool_name} not found."

async def handle_chat(message: str, history: list, context: dict) -> str:
    """
    Called by the chat route. Sends a message to Nova (Anthropic) with platform context.
    """
    if not settings.ANTHROPIC_API_KEY:
        logger.warning("[Nova] No Anthropic API key set. Returning fallback chat response.")
        return "I am Nova, your AI assistant. (Anthropic API key is missing from `.env`, so I am running in fallback mode.)"

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    system_prompt = f"""You are OG, an expert AI security operator embedded in VIGILORA AI.
You have access to live platform data. Be concise, professional, and use markdown formatting.
If the user asks you to perform an action or lookup data, use your tools! Always answer the user in natural language after using a tool.

Current platform state:
- Open incidents: {context.get('open_incidents', 0)} ({context.get('critical_incidents', 0)} critical)
- Cameras online: {context.get('online_cameras', 0)}/{context.get('total_cameras', 0)}
- Active threats (CISA KEV): {context.get('active_threats', 0)}
"""

    # Format history for Anthropic
    anthropic_messages = []
    for msg in history:
        # History messages are typically dicts like {"role": "user", "content": "..."}
        role = msg.role if hasattr(msg, 'role') else msg.get('role', 'user')
        content = msg.content if hasattr(msg, 'content') else msg.get('content', '')
        if role in ["user", "assistant"]:
            anthropic_messages.append({"role": role, "content": content})
            
    anthropic_messages.append({"role": "user", "content": message})

    try:
        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system=system_prompt,
            messages=anthropic_messages,
            tools=CHAT_TOOLS
        )
        
        # Check if the model wants to use a tool
        final_text = ""
        while response.stop_reason == "tool_use":
            anthropic_messages.append({
                "role": "assistant",
                "content": response.content
            })
            
            for block in response.content:
                if block.type == "tool_use":
                    logger.info(f"[Nova] Using tool {block.name}")
                    tool_result = await execute_tool(block.name, block.input)
                    
                    anthropic_messages.append({
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": tool_result
                            }
                        ]
                    })
                    
            response = await client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                system=system_prompt,
                messages=anthropic_messages,
                tools=CHAT_TOOLS
            )
            
        for block in response.content:
            if block.type == "text":
                final_text += block.text
                
        return final_text
    except Exception as e:
        logger.error(f"[Nova] handle_chat failed: {e}")
        return f"Sorry, I encountered an error communicating with the AI backend: {e}"
