"""Pydantic schemas for the Automated Alerting feature."""
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, field_validator

VALID_CHANNEL_TYPES = {"slack", "discord", "telegram", "email", "sms"}
VALID_SEVERITIES = {"critical", "high", "medium", "low"}


class AlertChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    channel_type: str  # 'slack' | 'discord' | 'telegram' | 'email' | 'sms'

    # Delivery config (only relevant fields needed per type)
    webhook_url: str | None = None        # Slack / Discord
    bot_token: str | None = None          # Telegram
    chat_id: str | None = None            # Telegram
    email_address: str | None = None      # Email
    phone_number: str | None = None       # SMS

    # SMTP config for email: {"host", "port", "username", "password", "use_tls"}
    smtp_config: dict[str, Any] | None = None

    # Twilio config for SMS: {"account_sid", "auth_token", "from_number"}
    twilio_config: dict[str, Any] | None = None

    # Filtering
    severity_threshold: str = "high"
    incident_types: list[str] | None = None  # None means all types
    enabled: bool = True

    @field_validator("channel_type")
    @classmethod
    def validate_channel_type(cls, v: str) -> str:
        if v not in VALID_CHANNEL_TYPES:
            raise ValueError(f"channel_type must be one of {VALID_CHANNEL_TYPES}")
        return v

    @field_validator("severity_threshold")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        if v not in VALID_SEVERITIES:
            raise ValueError(f"severity_threshold must be one of {VALID_SEVERITIES}")
        return v


class AlertChannelUpdate(BaseModel):
    """Partial update — all fields optional."""
    name: str | None = None
    webhook_url: str | None = None
    bot_token: str | None = None
    chat_id: str | None = None
    email_address: str | None = None
    phone_number: str | None = None
    smtp_config: dict[str, Any] | None = None
    twilio_config: dict[str, Any] | None = None
    severity_threshold: str | None = None
    incident_types: list[str] | None = None
    enabled: bool | None = None


class AlertChannelResponse(BaseModel):
    id: str
    name: str
    channel_type: str
    webhook_url: str | None
    email_address: str | None
    phone_number: str | None
    chat_id: str | None
    severity_threshold: str
    incident_types: list[str] | None
    enabled: bool
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class TestAlertResponse(BaseModel):
    success: bool
    message: str
