import sys
import os
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import get_db_session
from app.main import app
from app.models.chat import Base


@pytest.fixture(scope="session")
def test_database_url() -> str:
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL is not set; skipping postgres integration tests")
    return url


@pytest_asyncio.fixture
async def db_engine(test_database_url: str):
    """Function-scoped engine so asyncpg uses the same event loop as each test.

    Session-scoped engines break on pytest-asyncio >= 0.23 when function-scoped
    tests run on a fresh loop per test ("Future attached to a different loop").
    """
    engine = create_async_engine(
        test_database_url,
        pool_pre_ping=True,
        poolclass=NullPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    session_factory = async_sessionmaker(
        bind=db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        await session.execute(text("DELETE FROM chat_messages"))
        await session.execute(text("DELETE FROM chat_sessions"))
        await session.commit()
        yield session


@pytest_asyncio.fixture
async def api_client(db_session):
    async def _override_get_db_session():
        yield db_session

    app.dependency_overrides[get_db_session] = _override_get_db_session
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
    app.dependency_overrides.clear()
