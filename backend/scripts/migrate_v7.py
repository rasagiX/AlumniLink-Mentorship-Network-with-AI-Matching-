"""Migration v7 — create alumni_applications table + drop senior role support."""
from app.db.base import Base
from app.db.session import engine

Base.metadata.create_all(bind=engine)
print("Migration v7 complete — alumni_applications table created.")
