# Import all models here so Base.metadata knows about every table wherever
# this module gets imported — by app/main.py's create_all() today, and by
# Alembic's env.py if/when migrations are added later.
from app.db.base_class import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.mentor import Mentor  # noqa: F401
from app.models.mentorship_request import MentorshipRequest  # noqa: F401
