# CAMP: Make Project Runnable Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all bugs, set up database migrations, add auth, configure Docker, and make CAMP fully runnable with demo data.

**Architecture:** Fix existing skeleton code issues -> Configure Alembic for async PostgreSQL -> Add JWT auth middleware -> Create seed data -> Verify Docker build & run.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Alembic, PostgreSQL 16, Next.js 14, Docker Compose

---

## Known Bugs to Fix

1. `models/contract.py:16` - indentation error on `EXPIRED = "expired"`
2. `models/__init__.py` - missing model imports so Base.metadata has no tables
3. No Alembic configuration (database migrations don't exist)
4. No authentication system
5. Frontend missing `package-lock.json`
6. Docker volume paths need verification

---

### Task 1: Fix Code Bugs

**Files:**
- Modify: `backend/app/models/contract.py:12-18`
- Modify: `backend/app/models/__init__.py`

**Step 1: Fix ContractStatus enum indentation**

In `backend/app/models/contract.py`, line 16 has wrong indentation:

```python
# WRONG (current):
class ContractStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    EXPIRING = "expiring"
      EXPIRED = "expired"       # <-- extra spaces, causes SyntaxError
    TERMINATED = "terminated"
    RENEWED = "renewed"

# CORRECT:
class ContractStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    EXPIRING = "expiring"
    EXPIRED = "expired"
    TERMINATED = "terminated"
    RENEWED = "renewed"
```

**Step 2: Import all models in `__init__.py`**

Current `models/__init__.py` only defines Base but never imports models, so SQLAlchemy doesn't know about any tables:

```python
# CORRECT:
"""SQLAlchemy models base and imports."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


# Import all models so Base.metadata is populated
from app.models.mall import Mall, Building, Floor        # noqa: F401,E402
from app.models.unit import Unit, FloorPlan                # noqa: F401,E402
from app.models.tenant import Tenant                        # noqa: F401,E402
from app.models.contract import Contract, Invoice, Payment   # noqa: F401,E402
from app.models.operations import WorkOrder                  # noqa: F401,E402
```

**Step 3: Commit**

```bash
git add backend/app/models/
git commit -m "fix: resolve model import bug and contract enum indentation error"
```

---

### Task 2: Configure Alembic for Async Database Migrations

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`

**Step 1: Create alembic.ini**

```ini
[alembic]
script_location = alembic
sqlalchemy.url = postgresql+asyncpg://cdata:cdata_dev_password@localhost:5432/cdata

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

**Step 2: Create `alembic/env.py` with async support**

```python
"""Alembic environment configuration for async SQLAlchemy."""

import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

from app.config import get_settings
from app.database import Base
from app.models import *  # noqa: F401,F403 - import all models for autogenerate

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_settings().database_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> """Run migrations in 'online' mode with async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

**Step 3: Create `script.py.mako` template**

```python
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

**Step 4: Generate initial migration**

```bash
cd D:/work/camp/backend
alembic revision --autogenerate -m "initial schema"
```

**Step 5: Commit**

```bash
git add backend/alembic.ini backend/alembic/env.py backend/alembic/script.py.mako
git commit -m "feat: configure Alembic async migrations for PostgreSQL"
```

---

### Task 3: Add JWT Authentication System

**Files:**
- Create: `backend/app/core/security.py`
- Create: `backend/app/api/v1/auth.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/api/v1/__init__.py`

**Step 1: Create security module**

```python
"""JWT authentication utilities."""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None
```

**Step 2: Create auth endpoints**

```python
"""Authentication API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.core.security import verify_password, hash_password, create_access_token, decode_access_token

router = APIRouter()
security = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    username: str
    password: str
    email: str | None = None


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT token."""
    # For MVP: accept default admin credentials
    # TODO: Replace with real user table lookup
    if body.username == "admin" and body.password == "admin123":
        token = create_access_token({"sub": "admin", "role": "superadmin"})
        return TokenResponse(access_token=token)

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")


@router.get("/me")
async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    """Get current authenticated user info."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    return {"user_id": payload.get("sub"), "role": payload.get("role")}
```

**Step 3: Register auth router in main app**

Add to `app/api/v1/__init__.py`:
```python
from app.api.v1 import auth
router.include_router(auth.router, prefix="/auth", tags=["Auth"])
```

**Step 4: Commit**

```bash
git add backend/app/core/ backend/app/api/v1/auth.py backend/app/api/v1/__init__.py
git commit -m "feat: add JWT authentication system with login endpoint"
```

---

### Task 4: Create Seed Data Script

**Files:**
- Create: `backend/scripts/seed_data.py`

**Step 1: Create seed script**

This creates a realistic demo shopping mall with buildings, floors, units, tenants, and contracts:

```python
"""Seed data script for CAMP development/demo.

Usage (inside container):
    python scripts/seed_data.py
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import AsyncSessionLocal, engine
from app.models.mall import Mall, Building, Floor
from app.models.unit import Unit, UnitStatus, UnitLayoutType
from app.models.tenant import Tenant, TenantStatus
from app.models.contract import Contract, ContractStatus, PaymentFrequency


async def seed():
    """Create demo data: one mall with sample tenants and contracts."""
    async with engine.begin() as conn:
        # Drop and recreate tables for clean seed
        from app.models import Base
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Create Mall
        mall = Mall(
            name="Sunshine Plaza",
            code="SUNSHINE-001",
            address="123 Central Avenue",
            city="Shanghai",
            total_area=45000.0,
            status="active",
        )
        db.add(mall)
        await db.flush()

        # 2. Create Building
        building = Building(
            mall_id=mall.id,
            name="Main Building",
            code="A",
            total_floors=5,
        )
        db.add(building)
        await db.flush()

        # 3. Create Floors
        floors = []
        for floor_num in range(1, 6):
            floor = Floor(
                building_id=building.id,
                floor_number=floor_num,
                name=f"F{floor_num}",
                total_area=9000.0 if floor_num != 1 else 8000.0,
                sort_order=floor_num,
            )
            db.add(floor)
            floors.append(floor)
        await db.flush()

        # 4. Create Units (sample stores on each floor)
        unit_configs = [
            # Floor 1 (Ground) - Main entrance level
            ("A-101", "Zara", "retail", "occupied", 120),
            ("A-102", "H&M", "retail", "occupied", 200),
            ("A-103", "Uniqlo", "retail", "occupied", 150),
            ("A-104", "Starbucks", "food_court", "occupied", 45),
            ("A-105", "Luxottica", "retail", "vacant", 60),
            ("K-001", "Phone Accessories Kiosk", "kiosk", "occupied", 15),
            # Floor 2
            ("B-201", "Nike", "retail", "occupied", 180),
            ("B-202", "Adidas", "retail", "occupied", 160),
            ("B-203", "Sephora", "retail", "occupied", 90),
            ("B-204", "The Body Shop", "retail", "vacant", 70),
            ("B-205", "Miniso", "retail", "occupied", 80),
            # Floor 3
            ("C-301", "Apple Store", "anchor", "occupied", 300),
            ("C-302", "Samsung Experience", "retail", "occupied", 150),
            ("C-303", "Dyson", "retail", "reserved", 80),
            ("C-304", "BOSE", "retail", "vacant", 60),
        ]

        units_by_floor = {f.id: [] for f in floors}
        all_units = []

        for idx, (code, name, layout, status, area) in enumerate(unit_configs):
            floor_idx = 0 if idx < 6 else (1 if idx < 11 else 2)
            floor_id = floors[floor_idx].id

            unit = Unit(
                floor_id=floor_id,
                code=code,
                name=name,
                layout_type=UnitLayoutType(layout),
                status=UnitStatus(status),
                gross_area=float(area),
                hotspot_data={
                    "x": 50 + (idx % 5) * 180,
                    "y": 30 + (idx // 5) * 140,
                    "width": 160,
                    "height": 120,
                    "shape": "rect",
                } if idx < 10 else {
                    "x": 100 + (idx % 3) * 220,
                    "y": 50 + (idx // 3) * 160,
                    "width": 200,
                    "height": 140,
                    "shape": "rect",
                },
            )
            db.add(unit)
            all_units.append(unit)
            units_by_floor[floor_id].append(unit)
        await db.flush()

        # 5. Create Tenants
        tenant_data = [
            ("Zara China Retail Co., Ltd.", "company", "Zhang Wei", "138****1234"),
            ("H&M China", "company", "Li Ming", "139****5678"),
            ("Fast Retailing (Uniqlo)", "company", "Wang Fang", "137****9012"),
            ("Starbucks Coffee Shanghai", "company", "Chen Jie", "136****3456"),
            ("Nike Sports (China)", "company", "Liu Yang", "135****7890"),
            ("Adidas China", "company", "Zhao Qiang", "134****2345"),
            ("Sephora China", "company", "Sun Lei", "133****6789"),
            ("Miniso China", "company", "Zhou Ting", "132****0123"),
            ("Apple Retail China", "company", "Wu Hao", "131****4567"),
            ("Samsung Electronics China", "company", "Zheng Kai", "130****8901"),
        ]

        tenants = []
        for name, ttype, contact, phone in tenant_data:
            t = Tenant(
                name=name,
                type=ttype,
                contact_person=contact,
                phone=phone,
                status=TenantStatus.ACTIVE,
            )
            db.add(t)
            tenants.append(t)
        await db.flush()

        # 6. Create Contracts for occupied units
        occupied_units = [u for u in all_units if u.status == UnitStatus.OCCUPIED]
        from datetime import date, timedelta

        for i, unit in enumerate(occupied_units[:len(tenants)]):
            lease_start = date(2024, 1, 1) + timedelta(days=i * 30)
            lease_end = lease_start + timedelta(days=365 * 3)  # 3-year leases

            contract = Contract(
                tenant_id_ref=tenants[i].id,
                unit_id=unit.id,
                contract_number=f"CT-{mall.code}-{unit.code}-{lease_start.year}",
                status=ContractStatus.ACTIVE,
                lease_start=lease_start,
                lease_end=lease_end,
                monthly_rent=float(unit.gross_area or 100) * 8.5,  # ~8.5 RMB/sqm/day avg
                deposit=float(unit.gross_area or 100) * 8.5 * 3,  # 3 months rent
                currency="CNY",
                payment_frequency=PaymentFrequency.MONTHLY,
                signed_area=unit.gross_area,
                unit_code_at_signing=unit.code,
            )
            db.add(contract)
        await db.flush()

        await db.commit()

        print(f"\n{'='*50}")
        print(f"Seed data created successfully!")
        print(f"{'='*50}")
        print(f"Mall:     {mall.name} ({mall.code})")
        print(f"Building: {building.name} ({building.code})")
        print(f"Floors:   {len(floors)}")
        print(f"Units:    {len(all_units)} ({sum(1 for u in all_units if u.status == UnitStatus.OCCUPIED)} occupied)")
        print(f"Tenants:  {len(tenants)}")
        print(f"\nLogin: admin / admin123")
        print(f"API: http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(seed())
```

**Step 2: Commit**

```bash
git add backend/scripts/seed_data.py
git commit -m "feat: add seed data script with demo shopping mall"
```

---

### Task 5: Fix Docker Configuration and Verify Build

**Files:**
- Modify: `docker/docker-compose.yml`
- Modify: `docker/Dockerfile.backend`
- Modify: `docker/Dockerfile.frontend`

**Step 1: Update docker-compose.yml**

Fixes needed:
- Ensure upload volume path works on Windows
- Add healthcheck conditions properly
- Ensure frontend can reach backend via Docker network

**Key changes in compose file:**
- Backend should use `command` override for dev mode
- Add `networks` section for inter-service communication
- Fix volume mount paths for cross-platform compatibility

**Step 2: Update Dockerfile.backend**

Ensure it copies requirements correctly and has proper working directory handling.

**Step 3: Update Dockerfile.frontend**

Ensure node_modules is handled correctly (use .dockerignore or install in container).

**Step 4: Create `.dockerignore`**

```
node_modules
.next
.git
.env
__pycache__
*.pyc
.venv
uploads/*
!uploads/.gitkeep
```

**Step 5: Commit**

```bash
git add docker/ .dockerignore
git commit -m "fix: improve Docker configuration for reliable builds"
```

---

### Task 6: Update CHANGELOG.md

**Files:**
- Modify: `CHANGELOG.md`

Add entry at top documenting all changes made in Tasks 1-5.

**Step 7: Final Push**

```bash
git push origin master
```
