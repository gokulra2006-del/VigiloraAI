"""AudioEvent ORM model for Sentinel-ai Multimodal Detection Subsystem."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from config.database import Base


def _uuid() -> str:
    return uuid.uuid4().hex[:12]


class AudioEvent(Base):
    """Stores an acoustic detection event (e.g. glass break, scream, impact, siren)."""
    __tablename__ = "audio_events"

    id = Column(String, primary_key=True, default=_uuid, index=True)
    camera_id = Column(String, ForeignKey("cameras.id"), nullable=True, index=True)
    event_type = Column(String(60), nullable=False, index=True)  # glass_break, scream_aggression, loud_impact, alarm_siren
    confidence = Column(Float, nullable=False)  # 0.0 – 1.0
    decibel_level = Column(Float, nullable=True)  # Estimated acoustic energy / dB
    duration = Column(Float, default=1.0)  # Event duration in seconds
    source = Column(String(20), default="audio")  # audio
    is_simulated = Column(Boolean, default=False)
    metadata_json = Column(JSON, nullable=True)  # Spectral details, frequency analysis, etc.
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    camera = relationship("Camera", lazy="selectin")