from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from config.database import get_db
from models.assets import TrafficMetric

router = APIRouter()

@router.get("/")
async def get_traffic(db: AsyncSession = Depends(get_db)):
    # Get last 24 records
    result = await db.execute(select(TrafficMetric).order_by(TrafficMetric.timestamp.desc()).limit(24))
    metrics = result.scalars().all()
    metrics.reverse()
    return metrics
