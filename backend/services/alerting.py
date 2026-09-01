"""
Alerting Service — dispatches notifications across all configured channels.

Supports:
  - Slack (Incoming Webhook)
  - Discord (Webhook)
  - Telegram (Bot API)
  - Email (SMTP via aiosmtplib)
  - SMS (Twilio REST API via aiohttp)

Called by: api/routes/incidents.py → create_incident()
"""
import asyncio
import json
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiohttp
from sqlalchemy.future import select

from config.database import AsyncSessionLocal
from models.assets import AlertChannel, Incident

logger = logging.getLogger(__name__)

# Severity ordering — used to filter channels by threshold
SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def _severity_meets_threshold(incident_severity: str, threshold: str) -> bool:
    """Return True if incident_severity is >= threshold (i.e., as serious or more serious)."""
    return SEVERITY_ORDER.get(incident_severity, 99) <= SEVERITY_ORDER.get(threshold, 99)


def _build_alert_payload(incident: Incident) -> dict:
    """Build a unified alert context dict from an incident ORM object."""
    return {
        "id": incident.id,
        "type": incident.type,
        "severity": incident.severity if isinstance(incident.severity, str) else incident.severity.value,
        "description": incident.description or "No description provided.",
        "camera_id": incident.camera_id or "Unknown",
        "detected_at": incident.detected_at.isoformat() if incident.detected_at else "Unknown",
    }


# ---------------------------------------------------------------------------
# Per-channel send functions
# ---------------------------------------------------------------------------

async def _send_slack(session: aiohttp.ClientSession, channel: AlertChannel, ctx: dict) -> bool:
    """Send a Slack message via Incoming Webhook."""
    severity_emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(ctx["severity"], "⚪")
    payload = {
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"{severity_emoji} VIGILORA AI Alert: {ctx['type']}"},
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Severity:*\n{ctx['severity'].upper()}"},
                    {"type": "mrkdwn", "text": f"*Camera:*\n{ctx['camera_id']}"},
                    {"type": "mrkdwn", "text": f"*Time:*\n{ctx['detected_at']}"},
                    {"type": "mrkdwn", "text": f"*Incident ID:*\n`{ctx['id']}`"},
                ],
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*Description:*\n{ctx['description']}"},
            },
        ]
    }
    try:
        async with session.post(channel.webhook_url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status in (200, 204):
                return True
            logger.warning(f"[Alerting] Slack failed ({resp.status}): {await resp.text()}")
            return False
    except Exception as exc:
        logger.error(f"[Alerting] Slack exception: {exc}")
        return False


async def _send_discord(session: aiohttp.ClientSession, channel: AlertChannel, ctx: dict) -> bool:
    """Send a Discord embed via Webhook."""
    color_map = {"critical": 0xFF0000, "high": 0xFF6600, "medium": 0xFFCC00, "low": 0x00CC00}
    payload = {
        "embeds": [
            {
                "title": f"🚨 {ctx['type'].replace('_', ' ').title()}",
                "description": ctx["description"],
                "color": color_map.get(ctx["severity"], 0x7289DA),
                "fields": [
                    {"name": "Severity", "value": ctx["severity"].upper(), "inline": True},
                    {"name": "Camera", "value": ctx["camera_id"], "inline": True},
                    {"name": "Incident ID", "value": f"`{ctx['id']}`", "inline": True},
                    {"name": "Detected At", "value": ctx["detected_at"], "inline": False},
                ],
                "footer": {"text": "VIGILORA AI Security Platform"},
            }
        ]
    }
    try:
        async with session.post(channel.webhook_url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status in (200, 204):
                return True
            logger.warning(f"[Alerting] Discord failed ({resp.status}): {await resp.text()}")
            return False
    except Exception as exc:
        logger.error(f"[Alerting] Discord exception: {exc}")
        return False


async def _send_telegram(session: aiohttp.ClientSession, channel: AlertChannel, ctx: dict) -> bool:
    """Send a Telegram message via Bot API."""
    emoji_map = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}
    emoji = emoji_map.get(ctx["severity"], "⚪")
    text = (
        f"{emoji} *VIGILORA ALERT — {ctx['type'].replace('_', ' ').upper()}*\n\n"
        f"*Severity:* {ctx['severity'].upper()}\n"
        f"*Camera:* {ctx['camera_id']}\n"
        f"*Detected:* {ctx['detected_at']}\n"
        f"*ID:* `{ctx['id']}`\n\n"
        f"_{ctx['description']}_"
    )
    url = f"https://api.telegram.org/bot{channel.bot_token}/sendMessage"
    payload = {"chat_id": channel.chat_id, "text": text, "parse_mode": "Markdown"}
    try:
        async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            data = await resp.json()
            if data.get("ok"):
                return True
            logger.warning(f"[Alerting] Telegram failed: {data}")
            return False
    except Exception as exc:
        logger.error(f"[Alerting] Telegram exception: {exc}")
        return False


async def _send_email(channel: AlertChannel, ctx: dict) -> bool:
    """Send an email alert via SMTP (runs in thread pool to avoid blocking)."""
    cfg = channel.smtp_config or {}
    host = cfg.get("host", "")
    port = int(cfg.get("port", 587))
    username = cfg.get("username", "")
    password = cfg.get("password", "")
    use_tls = cfg.get("use_tls", True)

    if not host or not channel.email_address:
        logger.warning("[Alerting] Email channel missing SMTP config or destination address.")
        return False

    subject = f"[VIGILORA AI] {ctx['severity'].upper()} Alert: {ctx['type']}"
    html_body = f"""
    <html><body style="font-family:sans-serif; background:#0a0a0b; color:#eee; padding:24px;">
      <div style="max-width:560px; margin:0 auto; background:#18181b; border-radius:8px; padding:24px; border:1px solid #27272a;">
        <h2 style="color:#ef4444; margin:0 0 16px">🚨 VIGILORA AI Security Alert</h2>
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="padding:6px 0; color:#a1a1aa;">Type</td><td style="padding:6px 0; font-weight:bold;">{ctx['type']}</td></tr>
          <tr><td style="padding:6px 0; color:#a1a1aa;">Severity</td><td style="padding:6px 0; color:#f97316; font-weight:bold;">{ctx['severity'].upper()}</td></tr>
          <tr><td style="padding:6px 0; color:#a1a1aa;">Camera</td><td style="padding:6px 0;">{ctx['camera_id']}</td></tr>
          <tr><td style="padding:6px 0; color:#a1a1aa;">Detected</td><td style="padding:6px 0;">{ctx['detected_at']}</td></tr>
          <tr><td style="padding:6px 0; color:#a1a1aa;">ID</td><td style="padding:6px 0; font-family:monospace;">{ctx['id']}</td></tr>
        </table>
        <p style="margin-top:16px; color:#d4d4d8;">{ctx['description']}</p>
        <p style="margin-top:24px; font-size:12px; color:#52525b;">Sent by VIGILORA AI Automated Alerting</p>
      </div>
    </body></html>
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = username
    msg["To"] = channel.email_address
    msg.attach(MIMEText(html_body, "html"))

    def _sync_send():
        context = ssl.create_default_context() if use_tls else None
        with smtplib.SMTP(host, port) as smtp:
            if use_tls:
                smtp.starttls(context=context)
            if username and password:
                smtp.login(username, password)
            smtp.sendmail(username, channel.email_address, msg.as_string())

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _sync_send)
        return True
    except Exception as exc:
        logger.error(f"[Alerting] Email exception: {exc}")
        return False


async def _send_sms(session: aiohttp.ClientSession, channel: AlertChannel, ctx: dict) -> bool:
    """Send an SMS via Twilio REST API."""
    cfg = channel.twilio_config or {}
    account_sid = cfg.get("account_sid", "")
    auth_token = cfg.get("auth_token", "")
    from_number = cfg.get("from_number", "")

    if not account_sid or not auth_token or not from_number or not channel.phone_number:
        logger.warning("[Alerting] SMS channel missing Twilio config.")
        return False

    body = (
        f"VIGILORA ALERT [{ctx['severity'].upper()}]: {ctx['type']} detected on {ctx['camera_id']}. "
        f"ID: {ctx['id']}"
    )
    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    data = aiohttp.FormData()
    data.add_field("To", channel.phone_number)
    data.add_field("From", from_number)
    data.add_field("Body", body)

    try:
        auth = aiohttp.BasicAuth(account_sid, auth_token)
        async with session.post(url, data=data, auth=auth, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status in (200, 201):
                return True
            logger.warning(f"[Alerting] Twilio SMS failed ({resp.status}): {await resp.text()}")
            return False
    except Exception as exc:
        logger.error(f"[Alerting] SMS exception: {exc}")
        return False


# ---------------------------------------------------------------------------
# Main dispatch function
# ---------------------------------------------------------------------------

async def dispatch_alert(incident: Incident) -> None:
    """
    Query enabled channels, filter by severity + incident type, and fire them.
    This runs as a background task — never raises to the caller.
    """
    try:
        incident_severity = incident.severity if isinstance(incident.severity, str) else incident.severity.value
        incident_type = incident.type
        ctx = _build_alert_payload(incident)

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(AlertChannel).where(AlertChannel.enabled == True)  # noqa: E712
            )
            channels: list[AlertChannel] = list(result.scalars().all())

        if not channels:
            return

        async with aiohttp.ClientSession() as session:
            tasks = []
            for ch in channels:
                # Severity filter
                if not _severity_meets_threshold(incident_severity, ch.severity_threshold):
                    continue
                # Incident type filter (None = all)
                if ch.incident_types and incident_type not in ch.incident_types:
                    continue

                if ch.channel_type == "slack" and ch.webhook_url:
                    tasks.append(_send_slack(session, ch, ctx))
                elif ch.channel_type == "discord" and ch.webhook_url:
                    tasks.append(_send_discord(session, ch, ctx))
                elif ch.channel_type == "telegram" and ch.bot_token and ch.chat_id:
                    tasks.append(_send_telegram(session, ch, ctx))
                elif ch.channel_type == "email" and ch.email_address:
                    tasks.append(_send_email(ch, ctx))
                elif ch.channel_type == "sms" and ch.phone_number:
                    tasks.append(_send_sms(session, ch, ctx))

            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                success_count = sum(1 for r in results if r is True)
                logger.info(f"[Alerting] Dispatched to {success_count}/{len(tasks)} channels for incident {incident.id}")

    except Exception as exc:
        logger.error(f"[Alerting] dispatch_alert failed unexpectedly: {exc}")


async def test_channel(channel: AlertChannel) -> tuple[bool, str]:
    """Send a synthetic test alert through a single channel. Returns (success, message)."""
    test_ctx = {
        "id": "test-000000",
        "type": "test_alert",
        "severity": "high",
        "description": "This is a test alert from VIGILORA AI. If you see this, your channel is configured correctly.",
        "camera_id": "test-cam",
        "detected_at": "2026-01-01T00:00:00Z",
    }
    try:
        async with aiohttp.ClientSession() as session:
            if channel.channel_type == "slack" and channel.webhook_url:
                ok = await _send_slack(session, channel, test_ctx)
            elif channel.channel_type == "discord" and channel.webhook_url:
                ok = await _send_discord(session, channel, test_ctx)
            elif channel.channel_type == "telegram" and channel.bot_token and channel.chat_id:
                ok = await _send_telegram(session, channel, test_ctx)
            elif channel.channel_type == "email" and channel.email_address:
                ok = await _send_email(channel, test_ctx)
            elif channel.channel_type == "sms" and channel.phone_number:
                ok = await _send_sms(session, channel, test_ctx)
            else:
                return False, "Channel is missing required config fields."

        return (True, "Test alert sent successfully.") if ok else (False, "Delivery failed. Check server logs for details.")
    except Exception as exc:
        return False, f"Exception during test: {exc}"
