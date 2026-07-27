"""FastAPI router for Alert Channel management (CRUD + test)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from config.database import get_db
from models.assets import AlertChannel
from schemas.alerting import (
    AlertChannelCreate,
    AlertChannelResponse,
    AlertChannelUpdate,
    TestAlertResponse,
)
from security.auth import get_current_user
from services.alerting import test_channel

router = APIRouter()


@router.get("/channels", response_model=list[AlertChannelResponse])
async def list_alert_channels(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all configured alert channels."""
    result = await db.execute(select(AlertChannel).order_by(AlertChannel.created_at.desc()))
    return result.scalars().all()


@router.post("/channels", response_model=AlertChannelResponse, status_code=status.HTTP_201_CREATED)
async def create_alert_channel(
    channel_in: AlertChannelCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new alert channel."""
    channel = AlertChannel(
        name=channel_in.name,
        channel_type=channel_in.channel_type,
        webhook_url=channel_in.webhook_url,
        bot_token=channel_in.bot_token,
        chat_id=channel_in.chat_id,
        email_address=channel_in.email_address,
        phone_number=channel_in.phone_number,
        smtp_config=channel_in.smtp_config,
        twilio_config=channel_in.twilio_config,
        severity_threshold=channel_in.severity_threshold,
        incident_types=channel_in.incident_types,
        enabled=channel_in.enabled,
    )
    db.add(channel)
    await db.commit()
    await db.refresh(channel)
    return channel


@router.get("/channels/{channel_id}", response_model=AlertChannelResponse)
async def get_alert_channel(
    channel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single alert channel by ID."""
    result = await db.execute(select(AlertChannel).where(AlertChannel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Alert channel not found")
    return channel


@router.put("/channels/{channel_id}", response_model=AlertChannelResponse)
async def update_alert_channel(
    channel_id: str,
    channel_in: AlertChannelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update an existing alert channel (partial update supported)."""
    result = await db.execute(select(AlertChannel).where(AlertChannel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Alert channel not found")

    update_data = channel_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(channel, field, value)

    await db.commit()
    await db.refresh(channel)
    return channel


@router.delete("/channels/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_channel(
    channel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete an alert channel."""
    result = await db.execute(select(AlertChannel).where(AlertChannel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Alert channel not found")
    await db.delete(channel)
    await db.commit()


@router.post("/channels/{channel_id}/test", response_model=TestAlertResponse)
async def test_alert_channel(
    channel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Send a test alert through a specific channel to verify configuration."""
    result = await db.execute(select(AlertChannel).where(AlertChannel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Alert channel not found")

    success, message = await test_channel(channel)
    return TestAlertResponse(success=success, message=message)
