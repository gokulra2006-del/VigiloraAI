import asyncio
import logging
import json
import aiohttp
from typing import List, Dict, Any
from sqlalchemy.future import select
from config.database import AsyncSessionLocal
from config.settings import settings
from models.nova import NotificationConfig
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ssl

logger = logging.getLogger(__name__)

class NovaNotificationManager:
    """Manages Server-Sent Events (SSE) and multi-channel notifications for Nova."""
    def __init__(self):
        # Queues for SSE connections
        self.active_connections: List[asyncio.Queue] = []

    async def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self.active_connections.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self.active_connections:
            self.active_connections.remove(q)

    async def broadcast_in_app(self, event_data: dict):
        """Send an in-app notification to all connected SSE clients."""
        logger.info(f"[Nova] Broadcasting in-app notification: {event_data['summary']}")
        message = f"data: {json.dumps(event_data)}\n\n"
        for q in self.active_connections:
            await q.put(message)

    async def send_pushover(self, event_data: dict, session: aiohttp.ClientSession) -> bool:
        """Push notification to phone via Pushover."""
        if not settings.PUSHOVER_API_TOKEN or not settings.PUSHOVER_USER_KEY:
            logger.warning("Pushover credentials missing. Skipping push notification.")
            return False
            
        payload = {
            "token": settings.PUSHOVER_API_TOKEN,
            "user": settings.PUSHOVER_USER_KEY,
            "title": f"🚨 Nova Alert: {event_data.get('severity', 'Alert').upper()}",
            "message": event_data.get("summary", "New Sentinel Event"),
            "url": "http://localhost:5173",  # Link to dashboard
            "url_title": "Open SentinelVision"
        }
        try:
            async with session.post("https://api.pushover.net/1/messages.json", data=payload) as resp:
                if resp.status == 200:
                    return True
                logger.error(f"Pushover failed: {await resp.text()}")
        except Exception as e:
            logger.error(f"Pushover exception: {e}")
        return False

    async def send_twilio_sms(self, event_data: dict, session: aiohttp.ClientSession) -> bool:
        """Send SMS via Twilio for critical events."""
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_FROM_NUMBER or not settings.TWILIO_TO_NUMBER:
            logger.warning("Twilio credentials missing. Skipping SMS.")
            return False

        url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
        auth = aiohttp.BasicAuth(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        body = f"NOVA CRITICAL: {event_data.get('summary')}"
        data = aiohttp.FormData()
        data.add_field("To", settings.TWILIO_TO_NUMBER)
        data.add_field("From", settings.TWILIO_FROM_NUMBER)
        data.add_field("Body", body)

        try:
            async with session.post(url, data=data, auth=auth) as resp:
                if resp.status in (200, 201):
                    return True
                logger.error(f"Twilio failed: {await resp.text()}")
        except Exception as e:
            logger.error(f"Twilio exception: {e}")
        return False

    async def send_email(self, event_data: dict) -> bool:
        """Send email fallback."""
        if not settings.SMTP_HOST or not settings.SMTP_TO_EMAIL:
            logger.warning("SMTP credentials missing. Skipping email.")
            return False
            
        subject = f"[Nova {event_data.get('severity', '').upper()}] {event_data.get('summary')}"
        html_body = f"""
        <html>
        <body>
            <h2 style='color:red;'>Nova Incident Assessment</h2>
            <p><b>Summary:</b> {event_data.get('summary')}</p>
            <p><b>Recommended Actions:</b></p>
            <ul>
                {"".join([f"<li>{action}</li>" for action in event_data.get('recommended_actions', [])])}
            </ul>
        </body>
        </html>
        """
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_USER or "nova@sentinelvision.local"
        msg["To"] = settings.SMTP_TO_EMAIL
        msg.attach(MIMEText(html_body, "html"))

        def _sync_send():
            context = ssl.create_default_context()
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
                smtp.starttls(context=context)
                if settings.SMTP_USER and settings.SMTP_PASS:
                    smtp.login(settings.SMTP_USER, settings.SMTP_PASS)
                smtp.sendmail(msg["From"], msg["To"], msg.as_string())

        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _sync_send)
            return True
        except Exception as e:
            logger.error(f"Email exception: {e}")
            return False

    async def dispatch(self, assessment: dict):
        """Main dispatcher for a Nova incident assessment."""
        severity = assessment.get("severity", "medium").lower()
        
        # Look up configured channels for this severity
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(NotificationConfig).where(NotificationConfig.severity == severity)
            )
            config = result.scalar_one_or_none()
            
            if config:
                channels = config.channels
            else:
                # Default fallbacks if no config exists
                if severity == "critical":
                    channels = ["in_app", "push", "sms"]
                elif severity == "high":
                    channels = ["in_app", "push"]
                elif severity == "medium":
                    channels = ["in_app", "email"]
                else:
                    channels = ["in_app"]

        logger.info(f"[Nova] Dispatching {severity} alert to channels: {channels}")
        
        tasks = []
        async with aiohttp.ClientSession() as session:
            if "in_app" in channels:
                tasks.append(self.broadcast_in_app(assessment))
            if "push" in channels:
                tasks.append(self.send_pushover(assessment, session))
            if "sms" in channels:
                tasks.append(self.send_twilio_sms(assessment, session))
            if "email" in channels:
                tasks.append(self.send_email(assessment))
                
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

# Singleton instance
nova_notifier = NovaNotificationManager()
