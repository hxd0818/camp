"""SQLAlchemy models base and imports."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass

# Import all models so Base.metadata is populated with all tables
from app.models.mall import Mall, Building, Floor        # noqa: F401,E402
from app.models.unit import Unit, FloorPlan                # noqa: F401,E402
from app.models.tenant import Tenant                        # noqa: F401,E402
from app.models.contract import Contract, Invoice, Payment   # noqa: F401,E402
from app.models.operations import WorkOrder                  # noqa: F401,E402
from app.models.mock_business_data import MockBusinessData   # noqa: F401,E402
from app.models.market_news import MarketNews, NewsCategory  # noqa: F401,E402
from app.models.leasing_plan import LeasingPlan, PlanType, PlanStatus  # noqa: F401,E402
