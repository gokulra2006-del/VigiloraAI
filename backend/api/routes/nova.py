from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from config.database import get_db
from models.nova import NovaTask, Memory
from security.auth import get_current_user

router = APIRouter()

@router.get("/tasks")
async def get_nova_tasks(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(NovaTask).order_by(desc(NovaTask.created_at))
    )
    tasks = result.scalars().all()
    return tasks

@router.get("/memories")
async def get_nova_memories(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(Memory).order_by(desc(Memory.last_referenced_at))
    )
    memories = result.scalars().all()
    return memories
