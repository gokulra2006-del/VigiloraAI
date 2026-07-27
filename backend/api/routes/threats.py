from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from config.database import get_db
from models.assets import ThreatIntel

router = APIRouter()

@router.get("/")
async def get_threats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ThreatIntel).order_by(ThreatIntel.created_at.desc()))
    return result.scalars().all()
