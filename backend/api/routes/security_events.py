from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from config.database import get_db
from models.assets import SecurityEvent
from schemas.security_event import SecurityEventResponse
from security.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=list[SecurityEventResponse])
async def list_security_events(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).limit(limit))
    return result.scalars().all()
