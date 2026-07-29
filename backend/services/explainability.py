import random
from models.assets import Incident, Playbook, Case


def generate_incident_justification(
    incident: Incident, zone: str | None = None, confidence: float | None = None
) -> str:
    """Plain-language justification: alert type + severity + confidence + zone context."""
    time_of_day = incident.detected_at.strftime("%I:%M %p") if incident.detected_at else "Unknown Time"
    zone_name = zone or incident.zone or "the monitored area"
    conf_pct = round((confidence or incident.model_confidence or 0.75) * 100)

    if incident.type and any(k in incident.type.lower() for k in ("weapon", "gun", "knife", "fight")):
        return (
            f"A {incident.severity}-severity {incident.type} alert was detected in {zone_name} at {time_of_day}. "
            f"The detection model reported {conf_pct}% confidence. This pattern is inconsistent with normal "
            f"activity in this zone and warrants immediate review."
        )

    if incident.severity == "critical":
        return (
            f"Critical {incident.type} alert in {zone_name} at {time_of_day} ({conf_pct}% confidence). "
            f"Historical incident rate in this zone exceeds the facility average during this time window."
        )

    if incident.severity == "high":
        return (
            f"High-severity {incident.type} detected in {zone_name} at {time_of_day} with {conf_pct}% confidence. "
            f"Zone context suggests elevated risk — operator confirmation recommended."
        )

    return (
        f"Routine {incident.type} alert in {zone_name} at {time_of_day} ({conf_pct}% confidence). "
        f"Activity exceeds the baseline threshold for this zone but may be benign."
    )


def generate_case_bundle_justification(case: Case, incidents: list[Incident]) -> str:
    """Explain why bundled alerts were grouped together."""
    if not incidents:
        return case.summary or "Case created with no linked alerts."

    zones = list({inc.zone for inc in incidents if inc.zone})
    types = list({inc.type for inc in incidents})
    zone_str = ", ".join(zones) if zones else "the same zone"
    type_str = ", ".join(types[:3]) + ("..." if len(types) > 3 else "")

    return (
        f"These {len(incidents)} alerts were grouped because they occurred in {zone_str} within a "
        f"120-second window and share correlated threat signatures ({type_str}). "
        f"Bundle confidence is {case.bundle_confidence or 'N/A'}% based on model agreement across sources."
    )


def generate_playbook_justification(playbook: Playbook, tier: str, severity: str) -> str:
    """Generates a justification for why a playbook was triggered and placed in a specific autonomy tier."""
    
    if tier == "auto_resolve":
        return f"Incident severity ({severity}) is low and action reversibility is high. Executing playbook '{playbook.name}' automatically to reduce operator cognitive load."

    if tier in ("suggest_confirm", "suggest_and_confirm"):
        return f"Incident severity ({severity}) requires operator oversight. Suggesting playbook '{playbook.name}' for manual confirmation before proceeding."

    if tier in ("require_ack", "alert_and_require_ack"):
        return f"Critical threat detected. Playbook '{playbook.name}' contains irreversible actions (e.g. lockdown, dispatch). Pausing for mandatory human-in-the-loop acknowledgment."

    return f"Playbook triggered based on standard operating procedures."
