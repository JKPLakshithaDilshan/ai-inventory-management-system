from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.v1.router import api_router
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models import (  # noqa: F401  # Ensures model metadata is registered
    AuditLog,
    Category,
    Notification,
    Product,
    ProductLocation,
    Purchase,
    PurchaseItem,
    Role,
    Sale,
    SaleItem,
    StockLedger,
    Supplier,
    User,
    Warehouse,
)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    SessionLocal = async_sessionmaker(
        engine, 
        class_=AsyncSession, 
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        yield session
        await session.commit()

    await engine.dispose()


@pytest_asyncio.fixture
async def app(db_session: AsyncSession) -> AsyncGenerator[FastAPI, None]:
    app = FastAPI()
    app.include_router(api_router, prefix="/api/v1")

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield app


@pytest_asyncio.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client


@pytest_asyncio.fixture
async def seeded_user(db_session: AsyncSession) -> dict[str, str | int]:
    user = User(
        email="admin@test.example.com",
        username="admin",
        full_name="Admin User",
        hashed_password=get_password_hash("admin123"),
        is_active=True,
        is_superuser=True,
    )
    db_session.add(user)
    await db_session.flush()

    return {
        "id": user.id,
        "username": "admin",
        "password": "admin123",
        "email": user.email,
    }


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, seeded_user: dict[str, str | int]) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": seeded_user["username"], "password": seeded_user["password"]},
    )
    assert response.status_code == 200
    access_token = response.json()["access_token"]
    return {"Authorization": f"Bearer {access_token}"}
