import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Defaults to a dedicated Postgres database (not the dev/production one) so
# the suite exercises the same engine as production. Override with
# TEST_DATABASE_URL to point at a different instance (e.g. in CI).
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg2://alumnilink:alumnilink_dev_pw@localhost:5432/alumnilink_test",
)


@pytest.fixture()
def client():
    """A TestClient wired to a clean set of tables in the test database for
    each test — created fresh and dropped afterward, so tests never leak
    state into each other or touch the real dev database."""
    engine = create_engine(TEST_DATABASE_URL)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

    Base.metadata.drop_all(bind=engine)
    engine.dispose()
