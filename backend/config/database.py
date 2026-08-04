"""Async SQLAlchemy engine, session factory and FastAPI dependency."""
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base
from config.settings import settings

# Declarative base shared by every ORM model.
Base = declarative_base()

def _resolve_database_url(url: str) -> str:
    """Rewrite plain postgresql:// URLs to use the asyncpg driver.

    Supabase (and most hosted Postgres services) provide a standard
    ``postgresql://`` URI.  SQLAlchemy's async layer requires the
    ``postgresql+asyncpg://`` scheme, so we patch it automatically.
    Local SQLite URLs are returned unchanged.
    """
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        # Heroku / some providers use the shorthand "postgres://"
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url

_db_url = _resolve_database_url(settings.DATABASE_URL)
_is_postgres = _db_url.startswith("postgresql")

# Async engine + session factory.
# PostgreSQL gets a small connection pool suitable for serverless environments.
# SQLite uses StaticPool / NullPool behaviour via connect_args.
_engine_kwargs: dict = dict(
    echo=settings.DB_ECHO,
    pool_pre_ping=True,
    future=True,
)
if _is_postgres:
    _engine_kwargs.update(
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,
    )

engine = create_async_engine(_db_url, **_engine_kwargs)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session and always closes it."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables. Import models so they register on Base.metadata."""
    from backend import models  # noqa: F401  (ensures models are imported)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose_engine() -> None:
    """Dispose the engine's connection pool on shutdown."""
    await engine.dispose()
