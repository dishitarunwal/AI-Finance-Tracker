import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, URL
from sqlalchemy.orm import sessionmaker
from sqlalchemy_utils import database_exists, create_database, drop_database
from typing import Generator
import os

from app.main import app
from app.databases import get_db, Base
from app.config import settings

# Construct a test database URL safely
TEST_DB_NAME = os.getenv("TEST_DATABASE_NAME", "finance_test_db")
url_object = URL.create(
    "postgresql+psycopg2",
    username=os.getenv("DATABASE_USERNAME"),
    password=os.getenv("DATABASE_PASSWORD"),
    host=os.getenv("DATABASE_HOSTNAME"),
    port=int(os.getenv("DATABASE_PORT", 5432)),
    database=TEST_DB_NAME,
)
TEST_DATABASE_URL = url_object.render_as_string(hide_password=False)

engine = create_engine(url_object)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Setup a dedicated test database before tests, tear down after."""
    if database_exists(TEST_DATABASE_URL):
        drop_database(TEST_DATABASE_URL)
    
    create_database(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    
    yield
    
    engine.dispose()
    drop_database(TEST_DATABASE_URL)

@pytest.fixture(scope="function")
def db() -> Generator:
    """Creates a fresh database session for a test."""
    # We could theoretically use nested transactions for complete isolation per test
    # But for a simple test suite, just truncating/deleting tables can work, 
    # or just relying on unique data per test since it's a dedicated db.
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(scope="function")
def client(db) -> Generator:
    """Returns a TestClient with the dependency overridden."""
    def override_get_db():
        try:
            yield db
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    # Cleanup overrides after the test
    app.dependency_overrides.clear()
