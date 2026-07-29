import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, DateTime, JSON
from config.database import Base

def _uuid() -> str:
    return uuid.uuid4().hex[:12]

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Memory(Base):
    __tablename__ = "memories"
    id = Column(String, primary_key=True, default=_uuid)
    topic = Column(String(200), nullable=False)
    memory_type = Column(String(50), nullable=False)  # preference | fact | conversation | task | command
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    last_referenced_at = Column(DateTime(timezone=True), default=_utcnow)

class NovaTask(Base):
    __tablename__ = "nova_tasks"
    id = Column(String, primary_key=True, default=_uuid)
    title = Column(String(255), nullable=False)
    priority = Column(String(20), default="medium")  # high | medium | low
    status = Column(String(20), default="open")      # open | in_progress | done
    due_date = Column(DateTime(timezone=True), nullable=True)
    category = Column(String(50), default="personal") # personal | sentinel
    created_at = Column(DateTime(timezone=True), default=_utcnow)

class Knowledge(Base):
    __tablename__ = "knowledge_base"
    id = Column(String, primary_key=True, default=_uuid)
    title = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

class CommandLog(Base):
    __tablename__ = "command_log"
    id = Column(String, primary_key=True, default=_uuid)
    command_text = Column(Text, nullable=False)
    mode = Column(String(20), nullable=False)         # personal | sentinel
    result_text = Column(Text, nullable=True)
    success = Column(Boolean, default=True)
    timestamp = Column(DateTime(timezone=True), default=_utcnow)

class NotificationConfig(Base):
    """Stores which notification channels fire at which severity level."""
    __tablename__ = "nova_notification_config"
    id = Column(String, primary_key=True, default=_uuid)
    severity = Column(String(20), nullable=False, unique=True) # critical, high, medium, low
    channels = Column(JSON, default=list) # ["in_app", "push", "sms", "email"]
