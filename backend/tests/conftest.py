import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from config.database import Base, get_db
from models.assets import User, Camera
from security.auth import get_password_hash

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function", autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
async def client():
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c

@pytest.fixture(scope="function")
async def db_session():
    async with TestingSessionLocal() as session:
        yield session

@pytest.fixture(scope="function")
async def test_user(db_session):
    user = User(
        username="test_operator",
        hashed_password=get_password_hash("password123"),
        role="operator"
    )
    db_session.add(user)
    
    admin = User(
        username="test_admin",
        hashed_password=get_password_hash("password123"),
        role="admin"
    )
    db_session.add(admin)
    await db_session.commit()
    
    return user

@pytest.fixture(scope="function")
async def test_camera(db_session):
    cam = Camera(
        id="test-cam-1",
        name="Test Camera",
        location="Zone 1",
        fps=30,
        resolution="1080p",
        active_models=["YOLOv8"]
    )
    db_session.add(cam)
    await db_session.commit()
    return cam

@pytest.fixture(scope="function")
async def operator_token(client, test_user):
    resp = await client.post("/api/v1/auth/login", data={"username": "test_operator", "password": "password123"})
    return resp.json()["access_token"]

@pytest.fixture(scope="function")
async def admin_token(client, test_user):
    resp = await client.post("/api/v1/auth/login", data={"username": "test_admin", "password": "password123"})
    return resp.json()["access_token"]
