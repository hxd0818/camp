# 招商业务驾驶舱（Kanban Dashboard）实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 CAMP 平台构建完整的招商业务驾驶舱，包含 KPI 监控、图表可视化、拖拽式招商状态看板、品牌/铺位查询工具、计划管控和市场资讯 4 大模块。

**Architecture:** 混合模式 — 主驾驶舱页面（KPI + 图表 + Kanban 看板）+ 下钻子页面。后端新增聚合 API 层计算指标，前端使用 Recharts 图表 + @hello-pangea/dnd 拖拽。单商场维度，模拟经营数据先行。

**Tech Stack:** Next.js 14 (App Router) + FastAPI (async) + PostgreSQL 16 + Recharts ^2.12.0 + @hello-pangea/dnd ^16 + Tailwind CSS + SQLAlchemy 2.0 (async)

**Design Doc:** `docs/plans/2026-04-19-kanban-design.md`

---

## Phase 1: 数据模型层（Backend Models + Migrations）

### Task 1: 扩展 Tenant 模型 — 品牌能级字段

**Files:**
- Modify: `backend/app/models/tenant.py`
- Create: `backend/alembic/versions/xxx_add_brand_tier_to_tenant.py` (migration)

**Step 1: 在 Tenant 模型中添加 BrandTier 枚举和新字段**

在 `backend/app/models/tenant.py` 中：

```python
from enum import Enum

class BrandTier(str, Enum):
    S = "s"
    A = "a"
    B = "b"
    C = "c"
    LIANFA = "lianfa"
    UNKNOWN = "unknown"
```

在 Tenant 类中添加字段（在现有字段之后）：

```python
brand_tier: Mapped[BrandTier | None] = mapped_column(
    String(10), nullable=True, default=None,
    comment="品牌能级: S/A/B/C/lianfa"
)
is_flagship: Mapped[bool | None] = mapped_column(
    Boolean, nullable=True, default=False,
    comment="是否旗舰店/高标店"
)
is_first_entry: Mapped[bool | None] = mapped_column(
    Boolean, nullable=True, default=False,
    comment="是否首进品牌"
)
```

**Step 2: 创建 Alembic 迁移**

```bash
docker exec camp-backend alembic revision --autogenerate -m "add brand tier fields to tenant"
```

验证迁移文件包含：
- `brand_tier` (String(10), nullable)
- `is_flagship` (Boolean, nullable, default False)
- `is_first_entry` (Boolean, nullable, default False)

**Step 3: 执行迁移**

```bash
docker exec camp-backend alembic upgrade head
```

**Step 4: 验证**

```bash
docker exec camp-postgres psql -U cdata -d cdata -c "\d tenants" | grep -E "brand_tier|is_flagship|is_first_entry"
```

Expected: 看到 3 个新列

**Step 5: Commit**

```bash
git add backend/app/models/tenant.py backend/alembic/versions/*brand_tier*
git commit -m "feat(tenant): add brand_tier, is_flagship, is_first_entry fields"
```

---

### Task 2: 扩展 Unit 模型 — 招商相关字段

**Files:**
- Modify: `backend/app/models/unit.py`
- Create: migration file (auto-generated)

**Step 1: 在 Unit 模型中添加新字段**

在 `backend/app/models/unit.py` 的 Unit 类中添加：

```python
vacancy_days: Mapped[int | None] = mapped_column(
    Integer, nullable=True, default=None,
    comment="空置天数"
)
leasing_type: Mapped[str | None] = mapped_column(
    String(20), nullable=True, default=None,
    comment="招商类型: new/renewal/adjustment"
)
```

**Step 2: 生成并执行迁移**

```bash
docker exec camp-backend alembic revision --autogenerate -m "add leasing fields to unit"
docker exec camp-backend alembic upgrade head
```

**Step 3: Commit**

```bash
git add backend/app/models/unit.py backend/alembic/versions/*leasing*
git commit -m "feat(unit): add vacancy_days and leasing_type fields"
```

---

### Task 3: 新建 LeasingPlan 模型（招商计划）

**Files:**
- Create: `backend/app/models/leasing_plan.py`
- Create: migration file (auto-generated)

**Step 1: 创建 LeasingPlan 模型文件**

新建 `backend/app/models/leasing_plan.py`:

```python
"""Leasing Plan model for tracking leasing business plans."""

import enum
from datetime import date, datetime
from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PlanType(str, enum.Enum):
    ADJUSTMENT = "adjustment"
    SPECIAL = "special"


class PlanStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class LeasingPlan(Base):
    __tablename__ = "leasing_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    mall_id: Mapped[int] = mapped_column(Integer, ForeignKey("malls.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    plan_type: Mapped[PlanType] = mapped_column(String(20), default=PlanType.ADJUSTMENT)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    target_area: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_units: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completed_area: Mapped[float] = mapped_column(Float, default=0)
    completed_units: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[PlanStatus] = mapped_column(String(20), default=PlanStatus.DRAFT, index=True)
    owner: Mapped[str | None] = mapped_column(String(100), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    mall = relationship("Mall", lazy="selectin")
```

**Step 2: 确保 models/__init__.py 导入新模型**

检查 `backend/app/models/__init__.py` 包含:
```python
from app.models.leasing_plan import LeasingPlan, PlanType, PlanStatus
```

**Step 3: 生成并执行迁移**

```bash
docker exec camp-backend alembic revision --autogenerate -m "add leasing_plans table"
docker exec camp-backend alembic upgrade head
```

**Step 4: 验证表已创建**

```bash
docker exec camp-postgres psql -U cdata -d cdata -c "\d leasing_plans"
```

**Step 5: Commit**

```bash
git add backend/app/models/leasing_plan.py backend/app/models/__init__.py backend/alembic/versions/*leasing_plans*
git commit -m "feat(models): add LeasingPlan model for leasing plan management"
```

---

### Task 4: 新建 MarketNews 模型（市场资讯）

**Files:**
- Create: `backend/app/models/market_news.py`
- Create: migration file (auto-generated)

**Step 1: 创建 MarketNews 模型文件**

新建 `backend/app/models/market_news.py`:

```python
"""Market News model for industry news and updates."""

import enum
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class NewsCategory(str, enum.Enum):
    INDUSTRY = "industry"
    POLICY = "policy"
    GROUP = "group"


class MarketNews(Base):
    __tablename__ = "market_news"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    mall_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("malls.id"), nullable=True, index=True)

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(200), nullable=True)
    category: Mapped[NewsCategory] = mapped_column(String(20), default=NewsCategory.INDUSTRY)
    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_published: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    mall = relationship("Mall", lazy="selectin")
```

**Step 2: 更新 models/__init__.py 导入**

添加:
```python
from app.models.market_news import MarketNews, NewsCategory
```

**Step 3: 生成并执行迁移**

```bash
docker exec camp-backend alembic revision --autogenerate -m "add market_news table"
docker exec camp-backend alembic upgrade head
```

**Step 4: Commit**

```bash
git add backend/app/models/market_news.py backend/app/models/__init__.py backend/alembic/versions/*market_news*
git commit -m "feat(models): add MarketNews model for market information"
```

---

### Task 5: 新建 MockBusinessData 模型（模拟经营数据）

**Files:**
- Create: `backend/app/models/mock_business_data.py`
- Create: migration file (auto-generated)

**Step 1: 创建 MockBusinessData 模型文件**

新建 `backend/app/models/mock_business_data.py`:

```python
"""Mock Business Data model for simulating operational metrics in Q2/Q3."""

from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MockBusinessData(Base):
    __tablename__ = "mock_business_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mall_id: Mapped[int] = mapped_column(Integer, ForeignKey("malls.id"), nullable=False, index=True)
    unit_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("units.id"), nullable=True, index=True)
    tenant_id_ref: Mapped[int | None] = mapped_column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    data_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    daily_traffic: Mapped[int | None] = mapped_column(Integer, nullable=True)
    daily_sales: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    monthly_sales: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    sales_per_sqm: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    rent_to_sales_ratio: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

**Step 2: 更新 models/__init__.py 导入**

添加:
```python
from app.models.mock_business_data import MockBusinessData
```

**Step 3: 生成并执行迁移**

```bash
docker exec camp-backend alembic revision --autogenerate -m "add mock_business_data table"
docker exec camp-backend alembic upgrade head
```

**Step 4: Commit**

```bash
git add backend/app/models/mock_business_data.py backend/app/models/__init__.py backend/alembic/versions/*mock_biz*
git commit -m "feat(models): add MockBusinessData model for simulated operational data"
```

---

### Task 6: 创建驾驶舱种子数据脚本

**Files:**
- Create: `backend/scripts/seed_dashboard_data.py`

**Step 1: 创建种子数据脚本**

新建 `backend/scripts/seed_dashboard_data.py`。该脚本需要：

1. 为现有 Tenant 记录设置合理的 `brand_tier` 值（混合 S/A/B/C/lianfa）
2. 为现有 Unit 记录设置 `vacancy_days` 和 `leasing_type`
3. 创建 3-5 条示例 LeasingPlan 记录（不同状态：active/in_progress/completed）
4. 创建 5-8 条示例 MarketNews 记录（不同分类）
5. 为有活跃合同的铺位创建 MockBusinessData 记录（最近 3 个月的数据）

关键数据规则：
- 已入驻的铺位 (status=occupied): vacancy_days=NULL, 有 mock_biz_data
- 空置铺位 (status=vacant): vacancy_days 随机 15-200 天
- 品牌分级比例: S=10%, A=25%, B=35%, C=20%, lianfa=10%
- 招商计划: 至少 1 个 active, 1 个 in_progress, 1 个 completed

**Step 2: 执行种子数据脚本**

```bash
docker exec camp-backend python scripts/seed_dashboard_data.py
```

**Step 3: 验证数据**

```bash
docker exec camp-postgres psql -U cdata -d cdata -c "SELECT brand_tier, COUNT(*) FROM tenants GROUP BY brand_tier;"
docker exec camp-postgres psql -U cdata -d cdata -c "SELECT status, COUNT(*) FROM leasing_plans GROUP BY status;"
docker exec camp-postgres psql -U cdata -d cdata -c "SELECT COUNT(*) FROM market_news;"
docker exec camp-postgres psql -U cdata -d cdata -c "SELECT COUNT(*) FROM mock_business_data;"
```

**Step 4: Commit**

```bash
git add backend/scripts/seed_dashboard_data.py
git commit -m "feat(seeds): add dashboard seed data script with brands, plans, news, mock biz data"
```

---

## Phase 2: 后端 Schema + API 层

### Task 7: 创建驾驶舱 Pydantic Schema

**Files:**
- Create: `backend/app/schemas/dashboard.py`

**Step 1: 创建完整的驾驶舱响应 Schema**

新建 `backend/app/schemas/dashboard.py`:

```python
"""Pydantic schemas for Dashboard / Kanban feature."""

from __future__ import annotations

from datetime import date, datetime
from pydantic import BaseModel, Field


# --- KPI Schemas ---

class KPIMetric(BaseModel):
    value: float
    change: float | None = None
    unit: str = ""


class DashboardKPIs(BaseModel):
    occupancy_rate: KPIMetric
    vacant_area: KPIMetric
    monthly_revenue: KPIMetric
    expiring_count: KPIMetric
    leasing_completion: KPIMetric
    lianfa_ratio: KPIMetric


class DashboardSummary(BaseModel):
    total_units: int
    occupied_units: int
    vacant_units: int
    total_area: float
    leased_area: float
    total_tenants: int
    active_contracts: int


class DashboardStatsResponse(BaseModel):
    mall_id: int
    mall_name: str
    period: str
    kpis: DashboardKPIs
    summary: DashboardSummary


# --- Kanban Schemas ---

class KanbanCardSchema(BaseModel):
    unit_id: int
    unit_code: str
    area: float | None = None
    floor_name: str = ""
    layout_type: str = ""
    tenant_name: str | None = None
    brand_tier: str | None = None
    vacancy_days: int | None = None
    monthly_rent: float | None = None


class KanbanColumnSchema(BaseModel):
    id: str
    title: str
    unit_count: int = 0
    total_area: float = 0
    cards: list[KanbanCardSchema] = Field(default_factory=list)


class KanbanDataResponse(BaseModel):
    columns: list[KanbanColumnSchema]


class KanbanMoveRequest(BaseModel):
    unit_id: int
    new_status: str


class KanbanMoveResponse(BaseModel):
    unit_id: int
    old_status: str
    new_status: str


# --- Chart Data Schemas ---

class VacancyBucketSchema(BaseModel):
    name: str
    value: float = 0
    count: int = 0
    color: str = ""


class VacancyAnalysisResponse(BaseModel):
    buckets: list[VacancyBucketSchema]
    total_vacant_area: float
    total_vacant_count: int


class LeaseTermBucketSchema(BaseModel):
    term: str
    count: int = 0
    area: float = 0


class LeaseTermResponse(BaseModel):
    buckets: list[LeaseTermBucketSchema]


class BrandTierBucketSchema(BaseModel):
    name: str
    value: int = 0
    color: str = ""
    percentage: float = 0


class BrandTierResponse(BaseModel):
    buckets: list[BrandTierBucketSchema]
    total: int


# --- Expiring Contracts ---

class ExpiringContractItem(BaseModel):
    contract_id: int
    contract_number: str
    unit_code: str
    tenant_name: str | None = None
    lease_end: date
    days_remaining: int
    monthly_rent: float | None = None
    status: str


class ExpiringContractsResponse(BaseModel):
    items: list[ExpiringContractItem]
    total: int
```

**Step 2: Commit**

```bash
git add backend/app/schemas/dashboard.py
git commit -m "feat(schemas): add dashboard Pydantic response schemas"
```

---

### Task 8: 创建计划与资讯 Schema

**Files:**
- Create: `backend/app/schemas/plan.py`
- Create: `backend/app/schemas/news.py`

**Step 1: 创建 Plan Schema**

新建 `backend/app/schemas/plan.py`:

```python
"""Pydantic schemas for Leasing Plan."""

from datetime import date, datetime
from pydantic import BaseModel, Field


class PlanBase(BaseModel):
    name: str = Field(..., max_length=200)
    plan_type: str = "adjustment"
    description: str | None = None
    target_area: float | None = None
    target_units: int | None = None
    owner: str | None = Field(None, max_length=100)
    start_date: date
    due_date: date
    notes: str | None = None


class PlanCreate(PlanBase):
    mall_id: int


class PlanUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    plan_type: str | None = None
    description: str | None = None
    target_area: float | None = None
    target_units: int | None = None
    completed_area: float | None = None
    completed_units: int | None = None
    status: str | None = None
    owner: str | None = Field(None, max_length=100)
    start_date: date | None = None
    due_date: date | None = None
    notes: str | None = None


class PlanResponse(PlanBase):
    id: int
    mall_id: int
    completed_area: float = 0
    completed_units: int = 0
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
```

**Step 2: 创建 News Schema**

新建 `backend/app/schemas/news.py`:

```python
"""Pydantic schemas for Market News."""

from datetime import datetime
from pydantic import BaseModel, Field


class NewsBase(BaseModel):
    title: str = Field(..., max_length=300)
    content: str | None = None
    source: str | None = Field(None, max_length=200)
    category: str = "industry"
    cover_image_url: str | None = None


class NewsCreate(NewsBase):
    mall_id: int | None = None
    is_published: bool = False


class NewsUpdate(BaseModel):
    title: str | None = Field(None, max_length=300)
    content: str | None = None
    source: str | None = Field(None, max_length=200)
    category: str | None = None
    cover_image_url: str | None = None
    is_published: bool | None = None


class NewsResponse(NewsBase):
    id: int
    mall_id: int | None = None
    is_published: bool
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
```

**Step 3: Commit**

```bash
git add backend/app/schemas/plan.py backend/app/schemas/news.py
git commit -m "feat(schemas): add plan and news Pydantic schemas"
```

---

### Task 9: 创建驾驶舱聚合 API（核心 — 最重要的一步）

**Files:**
- Create: `backend/app/api/v1/dashboard.py`
- Modify: `backend/app/main.py` (注册路由)

**Step 1: 创建 dashboard API 路由文件**

新建 `backend/app/api/v1/dashboard.py`。这是整个看板的核心 API 文件，包含以下端点：

端点清单（按优先级排序）：

1. **GET `/dashboard/stats?mall_id=`** — 核心聚合统计
   - 查询 Mall 确认存在
   - 并行执行 6 个 KPI 聚合查询:
     - `occupancy_rate`: `COUNT(units WHERE status='occupied') / COUNT(*) * 100`
     - `vacant_area`: `COALESCE(SUM(units.gross_area WHERE status='vacant'), 0)`
     - `monthly_revenue`: `COALESCE(SUM(contracts.monthly_rent WHERE status='active'), 0)`
     - `expiring_count`: `COUNT(contracts WHERE lease_end BETWEEN today AND today+30)`
     - `leasing_completion`: `(occupied+reserved)/total * 100`
     - `lianfa_ratio`: 联发品牌租户占比
   - 计算 summary 数据
   - 返回 `DashboardStatsResponse`

2. **GET `/dashboard/kanban?mall_id=&floor_id=&status=`** — 看板数据
   - 查询 mall 下所有 units（可按 floor_id 过滤）
   - LEFT JOIN tenants 获取租户信息
   - LEFT JOIN contracts 获取合同信息
   - LEFT JOIN floors 获取楼层名
   - 按 unit.status 分组为 columns
   - 每个卡片包含: unit_id, code, area, floor_name, layout_type, tenant_name, brand_tier, vacancy_days, monthly_rent
   - 计算每列的 unit_count 和 total_area
   - 返回 `KanbanDataResponse`

3. **PUT `/dashboard/kanban/move`** — 拖拽状态更新
   - 接收 `{unit_id, new_status}`
   - 查询 unit 存在性
   - 更新 `unit.status = new_status`
   - 如果 new_status == 'occupied'，同时更新 `vacancy_days = NULL`
   - 如果 new_status == 'vacant'，同时更新 `vacancy_days = 0`
   - 返回 `KanbanMoveResponse`

4. **GET `/dashboard/vacancy?mall_id=`** — 空铺结构分析
   - 查询所有 status='vacant' 的 units
   - 按 vacancy_days 分桶:
     - <90 天: "短期"
     - 90-180 天: "中期"
     - 180-365 天: "长期"
     - >=365 天: "超长期"
   - 每桶统计 count 和 sum(area)
   - 返回 `VacancyAnalysisResponse`

5. **GET `/dashboard/lease-term?mall_id=`** — 租约期限分布
   - 查询 mall 下所有 active 合同
   - 计算 `lease_end - lease_start` 天数，转换为年限分桶:
     - <365天: "1年以下"
     - 365-730天: "1-2年"
     - 730-1095天: "2-3年"
     - 1095-1825天: "3-5年"
     - >=1825天: "5年以上"
   - 每桶统计 count 和 sum(signed_area)
   - 返回 `LeaseTermResponse`

6. **GET `/dashboard/brand-tier?mall_id=`** — 品牌能级分布
   - 查询 mall 下有活跃合同的 tenants
   - 按 brand_tier 分组 COUNT
   - 计算百分比
   - 映射颜色: S=#1e40af, A=#3b82f6, B=#93c5fd, C=#9ca3af, lianfa=#06b6d4
   - 返回 `BrandTierResponse`

7. **GET `/dashboard/expiring?mall_id=&days=30`** — 即将到期合同
   - 查询 `lease_end BETWEEN today AND today+days` 的合同
   - JOIN unit 获取 unit_code, JOIN tenant 获取 tenant_name
   - 按 lease_end ASC 排序
   - 默认限制 10 条
   - 返回 `ExpiringContractsResponse`

**实现要点：**
- 所有查询使用 `async with AsyncSession(db) as session:` 模式
- stats 端点用 `asyncio.gather()` 并行执行多个聚合查询
- kanban 端点使用 `selectinload` 或显式 JOIN 避免N+1
- 所有端点需要 `mall_id` 参数并验证 mall 存在性
- 错误处理返回标准 HTTPException

**Step 2: 注册路由到 main.py**

在 `backend/app/main.py` 中添加:

```python
from app.api.v1.dashboard import router as dashboard_router
app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["dashboard"])
```

**Step 3: 重启后端容器测试**

```bash
docker restart camp-backend
# 等待启动完成后测试
curl http://localhost:8201/api/v1/docs  # 确认新端点出现
curl "http://localhost:8201/api/v1/dashboard/stats?mall_id=1"  # 测试 stats
curl "http://localhost:8201/api/v1/dashboard/kanban?mall_id=1"  # 测试 kanban
```

**Step 4: Commit**

```bash
git add backend/app/api/v1/dashboard.py backend/app/main.py
git commit -m "feat(api): add dashboard aggregation APIs (stats, kanban, charts)"
```

---

### Task 10: 创建招商计划 CRUD API

**Files:**
- Create: `backend/app/api/v1/plans.py`
- Modify: `backend/app/main.py`

**Step 1: 创建 plans API 路由文件**

新建 `backend/app/api/v1/plans.py`，包含完整 CRUD:

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/plans` | 列表（支持 mall_id, status, skip, limit 筛选） |
| POST | `/plans` | 创建 |
| GET | `/plans/{plan_id}` | 详情 |
| PUT | `/plans/{plan_id}` | 更新 |
| DELETE | `/plans/{plan_id}` | 删除（软删除或硬删除） |

**Step 2: 注册路由到 main.py**

```python
from app.api.v1.plans import router as plans_router
app.include_router(plans_router, prefix="/api/v1/plans", tags=["plans"])
```

**Step 3: Commit**

```bash
git add backend/app/api/v1/plans.py backend/app/main.py
git commit -m "feat(api): add leasing plan CRUD endpoints"
```

---

### Task 11: 创建市场资讯 CRUD API

**Files:**
- Create: `backend/app/api/v1/news.py`
- Modify: `backend/app/main.py`

**Step 1: 创建 news API 路由文件**

新建 `backend/app/api/v1/news.py`，包含完整 CRUD:

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/news` | 列表（支持 category, is_published, mall_id 筛选） |
| POST | `/news` | 创建 |
| GET | `/news/{news_id}` | 详情 |
| PUT | `/news/{news_id}` | 更新 |
| DELETE | `/news/{news_id}` | 删除 |
| PUT | `/news/{news_id}/publish` | 发布/取消发布 |

**Step 2: 注册路由到 main.py**

```python
from app.api.v1.news import router as news_router
app.include_router(news_router, prefix="/api/v1/news", tags=["news"])
```

**Step 3: Commit**

```bash
git add backend/app/api/v1/news.py backend/app/main.py
git commit -m "feat(api): add market news CRUD endpoints"
```

---

## Phase 3: 前端基础设施

### Task 12: 安装前端依赖 + 创建 API 客户端

**Files:**
- Modify: `frontend/package.json` (通过 npm install)
- Create: `frontend/lib/dashboard-api.ts`
- Modify: `frontend/lib/types.ts` (添加看板类型)

**Step 1: 安装 @hello-pangea/dnd**

```bash
cd frontend && npm install @hello-pangea/dnd
```

然后在 Docker 中重新构建前端:

```bash
docker compose -f docker/docker-compose.yml up -d --build frontend
```

**Step 2: 创建 dashboard-api.ts**

新建 `frontend/lib/dashboard-api.ts`:

```typescript
/** Dashboard-specific API client methods */
import { apiClient } from './api';

export const dashboardApi = {
  // Core KPI stats
  async getStats(mallId: number) {
    return apiClient.get(`/dashboard/stats?mall_id=${mallId}`);
  },

  // Kanban board data
  async getKanban(mallId: number, params?: { floor_id?: number; status?: string }) {
    const search = new URLSearchParams({ mall_id: String(mallId), ...params });
    return apiClient.get(`/dashboard/kanban?${search}`);
  },

  // Move unit (drag & drop)
  async moveUnit(unitId: number, newStatus: string) {
    return apiClient.put('/dashboard/kanban/move', { unit_id: unitId, new_status: newStatus });
  },

  // Vacancy analysis
  async getVacancy(mallId: number) {
    return apiClient.get(`/dashboard/vacancy?mall_id=${mallId}`);
  },

  // Lease term distribution
  async getLeaseTerm(mallId: number) {
    return apiClient.get(`/dashboard/lease-term?mall_id=${mallId}`);
  },

  // Brand tier distribution
  async getBrandTier(mallId: number) {
    return apiClient.get(`/dashboard/brand-tier?mall_id=${mallId}`);
  },

  // Expiring contracts
  async getExpiring(mallId: number, days = 30) {
    return apiClient.get(`/dashboard/expiring?mall_id=${mallId}&days=${days}`);
  },

  // Plans CRUD
  async listPlans(params?: Record<string, unknown>) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v !== undefined && search.set(k, String(v)));
    return apiClient.get(`/plans?${search}`);
  },
  async getPlan(id: number) {
    return apiClient.get(`/plans/${id}`);
  },
  async createPlan(data: Record<string, unknown>) {
    return apiClient.post('/plans', data);
  },
  async updatePlan(id: number, data: Record<string, unknown>) {
    return apiClient.put(`/plans/${id}`, data);
  },
  async deletePlan(id: number) {
    return apiClient.delete(`/plans/${id}`);
  },

  // News CRUD
  async listNews(params?: Record<string, unknown>) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v !== undefined && search.set(k, String(v)));
    return apiClient.get(`/news?${search}`);
  },
  async getNews(id: number) {
    return apiClient.get(`/news/${id}`);
  },
  async createNews(data: Record<string, unknown>) {
    return apiClient.post('/news', data);
  },
  async updateNews(id: number, data: Record<string, unknown>) {
    return apiClient.put(`/news/${id}`, data);
  },
  async deleteNews(id: number) {
    return apiClient.delete(`/news/${id}`);
  },
  async togglePublish(id: number, isPublished: boolean) {
    return apiClient.put(`/news/${id}/publish`, { is_published: isPublished });
  },
};
```

**Step 3: 更新 types.ts 添加看板类型**

在 `frontend/lib/types.ts` 末尾追加:

```typescript
// --- Dashboard Types ---

export interface KPIMetric {
  value: number;
  change: number | null;
  unit: string;
}

export interface DashboardKPIs {
  occupancy_rate: KPIMetric;
  vacant_area: KPIMetric;
  monthly_revenue: KPIMetric;
  expiring_count: KPIMetric;
  leasing_completion: KPIMetric;
  lianfa_ratio: KPIMetric;
}

export interface DashboardStats {
  mall_id: number;
  mall_name: string;
  period: string;
  kpis: DashboardKPIs;
  summary: {
    total_units: number;
    occupied_units: number;
    vacant_units: number;
    total_area: number;
    leased_area: number;
    total_tenants: number;
    active_contracts: number;
  };
}

export interface KanbanCard {
  unit_id: number;
  unit_code: string;
  area: number | null;
  floor_name: string;
  layout_type: string;
  tenant_name: string | null;
  brand_tier: string | null;
  vacancy_days: number | null;
  monthly_rent: number | null;
}

export interface KanbanColumn {
  id: string;
  title: string;
  unit_count: number;
  total_area: number;
  cards: KanbanCard[];
}

export interface KanbanData {
  columns: KanbanColumn[];
}

// Plan types
export interface LeasingPlan {
  id: number;
  mall_id: number;
  name: string;
  plan_type: string;
  description: string | null;
  target_area: number | null;
  target_units: number | null;
  completed_area: number;
  completed_units: number;
  status: string;
  owner: string | null;
  start_date: string;
  due_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

// News types
export interface MarketNews {
  id: number;
  mall_id: number | null;
  title: string;
  content: string | null;
  source: string | null;
  category: string;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
}
```

**Step 4: Commit**

```bash
git add frontend/lib/dashboard-api.ts frontend/lib/types.ts package.json package-lock.json
git commit -m "feat(frontend): add dashboard API client, types, and install dnd library"
```

---

## Phase 4: 前端核心组件

### Task 13: 创建 KPICard 组件

**Files:**
- Create: `frontend/components/dashboard/KPICard.tsx`

**Step 1: 实现 KPICard 组件**

组件规格:
- Props: `title`, `value`, `unit`, `change`, `period`, `color`, `onClick`, `loading`
- 显示: 标题 + 大号数值 + 单位 + 环比变化箭头
- change > 0 显示绿色上升箭头, < 0 显示红色下降箭头
- 点击整个卡片触发 onClick（用于下钻）
- loading 时显示骨架屏占位
- 使用 Tailwind 样式，白色背景 + 圆角边框 + 左侧彩色竖条

**Step 2: Commit**

```bash
git add frontend/components/dashboard/KPICard.tsx
git commit -m "feat(dashboard): add KPICard component"
```

---

### Task 14: 创建 ChartWrapper 组件

**Files:**
- Create: `frontend/components/dashboard/ChartWrapper.tsx`

**Step 1: 实现统一图表容器**

Props: `title`, `children`, `loading`, `empty`, `className`
- loading: 显示骨架屏动画（3 条脉冲横线）
- empty: 显示居中的"暂无数据"提示
- 正常: 白色卡片包裹 title + children
- 固定高度 `h-72` 保证图表区域一致

**Step 2: Commit**

```bash
git add frontend/components/dashboard/ChartWrapper.tsx
git commit -m "feat(dashboard): add ChartWrapper component for consistent chart display"
```

---

### Task 15: 创建三个图表组件

**Files:**
- Create: `frontend/components/dashboard/VacancyPieChart.tsx`
- Create: `frontend/components/dashboard/LeaseTermBarChart.tsx`
- Create: `frontend/components/dashboard/BrandTierDonut.tsx`

**Step 1: VacancyPieChart**

使用 Recharts `<PieChart>`:
- 数据源: `VacancyBucket[]` (name, value, count, color)
- `<Pie>` 配置: innerRadius=60, outerRadius=80, paddingAngle=2, dataKey="value"
- `<Cell>` 每个 bucket 用对应 color
- `<Legend>` 右侧垂直布局
- `<Tooltip>` 自定义 formatter 显示面积和数量
- 居中显示总空置面积文字

**Step 2: LeaseTermBarChart**

使用 Recharts `<BarChart>`:
- 数据源: `LeaseTermBucket[]` (term, count, area)
- X轴: term (年限区间)
- Y轴: 数量
- `<Bar>` fill="#0ea5e9" (camp-500 blue), radius=[4, 4, 0, 0]
- `<Tooltip>` 显示数量和面积
- 响应式宽度 100%

**Step 3: BrandTierDonut**

使用 Recharts `<PieChart>` (环形图):
- 数据源: `BrandTierBucket[]` (name, value, color, percentage)
- `<Pie>` innerRadius=55, outerRadius=80
- 中心显示总品牌数
- `<Legend>` 底部水平布局

**Step 4: Commit**

```bash
git add frontend/components/dashboard/VacancyPieChart.tsx frontend/components/dashboard/LeaseTermBarChart.tsx frontend/components/dashboard/BrandTierDonut.tsx
git commit -m "feat(dashboard): add VacancyPieChart, LeaseTermBarChart, BrandTierDonut components"
```

---

### Task 16: 创建 Kanban 看板组件（核心交互组件）

**Files:**
- Create: `frontend/components/dashboard/KanbanCard.tsx`
- Create: `frontend/components/dashboard/KanbanColumn.tsx`
- Create: `frontend/components/dashboard/KanbanBoard.tsx`

**Step 1: KanbanCard 组件**

展示单个铺位卡片的迷你信息:
- 顶部: unit_code (粗体) + area (右侧小字)
- 中间: floor_name + layout_type (灰色标签)
- 底部: tenant_name (如有) 或 "空置" + brand_tier 徽章 (如有色标)
- 接收 provided props from @hello-pangea/dnd Draggable
- 拖拽时半透明 (opacity 根据 dragging 状态切换)
- hover 效果: 阴影加深

**Step 2: KanbanColumn 组件**

单列容器:
- 列头: title + 数量 badge + 总面积
- Droppable 区域包含卡片列表
- 空状态提示 ("暂无铺位")
- 接收 provided props from @hello-pangea/dnd Droppable

**Step 3: KanbanBoard 组件（主控制器）**

DragDropContext 包装器:
- Props: `mallId: number`, `initialData: KanbanData | null`, `onRefresh`
- 内部 state 管理 columns 数据
- onDragEnd 处理:
  - 同列内拖拽: 忽略（或支持排序）
  - 跨列拖拽: 调用 `dashboardApi.moveUnit()` → 刷新数据
  - 成功后 Toast 提示 "A-102 状态已变更为 洽谈中"
  - 失败时回滚到原位置
- 顶部筛选栏: 楼层下拉框 + 状态筛选
- 加载状态: 骨架屏
- 列定义: vacant(红)/reserved(紫)/occupied(绿) — 对应 UnitStatus

**Step 4: Commit**

```bash
git add frontend/components/dashboard/KanbanCard.tsx frontend/components/dashboard/KanbanColumn.tsx frontend/components/dashboard/KanbanBoard.tsx
git commit -m "feat(dashboard): add Kanban Board components with drag-and-drop support"
```

---

### Task 17: 创建 ExpiringContractsTable 和 PlanProgressTable

**Files:**
- Create: `frontend/components/dashboard/ExpiringContractsTable.tsx`
- Create: `frontend/components/dashboard/PlanProgressTable.tsx`

**Step 1: ExpiringContractsTable**

表格展示即将到期合同:
- 列: 合同编号, 铺位, 租户, 到期日, 剩余天数, 月租金, 操作
- 剩余天数 <= 7 天: 行背景淡红色警告
- 剩余天数 <= 30 天: 行背景淡黄色提醒
- 操作列: "查看详情"链接到合同页
- 空状态: "暂无即将到期合同"

**Step 2: PlanProgressTable**

表格展示招商计划进度:
- 列: 计划名称, 类型(tag), 目标, 已完成, 进度条, 负责人, 截止日, 状态(tag), 操作
- 进度条: 基于 completed/target 的百分比, 颜色随状态变化
- 状态 tag: 进行中=蓝, 逾期=红, 完成=绿, 草稿=灰
- 截止日已过且非完成状态: 红色加粗
- 操作: 编辑按钮 / 完成按钮

**Step 3: Commit**

```bash
git add frontend/components/dashboard/ExpiringContractsTable.tsx frontend/components/dashboard/PlanProgressTable.tsx
git commit -m "feat(dashboard): add ExpiringContractsTable and PlanProgressTable components"
```

---

### Task 18: 创建 FilterBar 全局筛选组件

**Files:**
- Create: `frontend/components/dashboard/FilterBar.tsx`

**Step 1: 实现 FilterBar**

顶部筛选栏组件:
- 商场选择下拉框 (从 malls 列表加载)
- 时间范围选择 (本月/本季度/本年/自定义)
- 回调: `onMallChange`, `onPeriodChange`
- 固定在页面顶部, 白色背景, 底部阴影
- 响应式: 移动端折叠为图标按钮

**Step 2: Commit**

```bash
git add frontend/components/dashboard/FilterBar.tsx
git commit -m "feat(dashboard): add FilterBar component for global filtering"
```

---

## Phase 5: 前端页面组装

### Task 19: 创建驾驶舱主页面

**Files:**
- Create: `frontend/app/dashboard/page.tsx`
- Create: `frontend/app/dashboard/layout.tsx`

**Step 1: 创建 layout.tsx**

驾驶舱共享布局:
- 顶部导航栏: Logo + "招商业务驾驶舱" 标题 + 导航链接(首页/购物中心/驾驶舱)
- 子内容区: 最大宽度 max-w-[1600px], 居中
- 与现有页面风格一致 (bg-gray-50 背景)

**Step 2: 创建 page.tsx（主驾驶舱页面）**

这是最复杂的页面组件，按区域组织:

```
页面结构:
├── FilterBar (商场选择 + 时间范围)
├── KPI 卡片行 (grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4)
│   ├── KPICard: 出租率
│   ├── KPICard: 空置面积
│   ├── KPICard: 月租金收入
│   ├── KPICard: 即将到期
│   ├── KPICard: 招商完成率
│   └── KPICard: 联发品牌占比
├── 图表行 (grid grid-cols-1 md:grid-cols-3 gap-6)
│   ├── ChartWrapper > VacancyPieChart
│   ├── ChartWrapper > LeaseTermBarChart
│   └── ChartWrapper > BrandTierDonut
├── KanbanBoard (全宽)
├── 底部双栏 (grid grid-cols-1 lg:grid-cols-2 gap-6)
│   ├── ExpiringContractsTable
│   └── PlanProgressTable
```

数据加载策略:
- 页面加载时并行请求: stats + kanban + vacancy + lease-term + brand-tier + expiring + plans
- 使用 `Promise.allSettled` 并行加载，单个失败不影响其他
- 各区域独立 loading/error 状态
- FilterBar 切换商场时重新加载全部数据

**Step 3: Commit**

```bash
git add frontend/app/dashboard/page.tsx frontend/app/dashboard/layout.tsx
git commit -m "feat(dashboard): create main dashboard page with KPI, charts, kanban, tables"
```

---

### Task 20: 创建工具子页面（4 个）

**Files:**
- Create: `frontend/app/dashboard/tools/brands/page.tsx`
- Create: `frontend/app/dashboard/tools/units/page.tsx`
- Create: `frontend/app/dashboard/tools/projects/page.tsx`
- Create: `frontend/app/dashboard/news/page.tsx`

**Step 1: 品牌查询页面 (/dashboard/tools/brands)**

- 顶部搜索框 + 筛选器行 (能级/业态/状态)
- 表格: 品牌名称, 能级徽章, 类型, 合作铺位数, 总面积, 月租金总额, 状态, 操作
- 分页 (skip/limit)
- 操作: "查看详情"跳转到租户页

**Step 2: 铺位资源查询页面 (/dashboard/tools/units)**

- 多维筛选器 (楼宇/楼层/类型/状态/面积范围/租费范围)
- 表格视图: 铺位号, 楼层, 面积, 类型, 状态标签, 品牌, 月租金, "定位"按钮
- "定位"按钮 Link 到 `/malls/{id}/floors/{floorId}`
- 支持分页

**Step 3: 项目信息查询页面 (/dashboard/tools/projects)**

- 从当前 mall_id 获取 Mall 详情
- 2x2 信息卡网格: 基础信息 / 经营摘要 / 品牌结构 / 铺位结构
- 每张卡片内部用描述列表 (dl/dt/dd) 展示键值对
- 数据来自 dashboardApi.getStats() 的 summary + 补充查询

**Step 4: 市场资讯页面 (/dashboard/news)**

- 顶部 "+ 新增资讯" 按钮
- 文章列表: 标题, 分类标签(彩色), 来源, 发布时间, 状态(已发布/草稿), 操作(编辑/删除/发布)
- 新增/编辑弹窗模态框 (标题, 内容textarea, 来源, 分类, 封面URL)
- 发布/取消发布切换按钮

**Step 5: Commit**

```bash
git add frontend/app/dashboard/
git commit -m "feat(dashboard): add tools pages (brands, units, projects, news)"
```

---

### Task 21: 创建招商计划管理页面

**Files:**
- Create: `frontend/app/dashboard/plans/page.tsx`

**Step 1: 实现计划管理页面**

- 顶部: "+ 新增计划" 按钮
- 表格: 名称, 类型tag, 目标, 已完成, 进度条, 负责人, 截止日, 状态tag, 操作
- 新增弹窗: 名称*, 类型, 目标面积, 目标铺位数, 负责人, 开始日期*, 截止日*, 备注
- 编辑弹窗: 同上表单回填
- 删除确认: window.confirm 或自定义确认对话框
- 状态流转按钮: 草稿→激活→进行中→已完成 (每步按钮不同)

**Step 2: Commit**

```bash
git add frontend/app/dashboard/plans/page.tsx
git commit -m "feat(dashboard): add leasing plan management page with CRUD"
```

---

## Phase 6: 集成与收尾

### Task 22: 导航集成 + CHANGELOG 更新

**Files:**
- Modify: `frontend/app/page.tsx` (首页添加驾驶舱入口)
- Modify: `CHANGELOG.md`

**Step 1: 首页添加驾驶舱入口**

在首页 (`frontend/app/page.tsx`) 的导航或快捷入口区域添加:
- 卡片或链接: "招商业务驾驶舱" → `/dashboard`
- 图标和简短描述

**Step 2: 更新 CHANGELOG.md**

在 CHANGELOG.md 顶部添加 v0.1.14 条目:

```markdown
## [2026-04-19] v0.1.14 - 招商业务驾驶舱

### 概述
新增完整的招商业务驾驶舱功能，包含质量监控(KPI+图表+拖拽看板)、工具赋能(品牌/铺位/项目查询)、计划管控、市场资讯四大模块。

### 变更内容
- **数据模型**: Tenant扩展品牌能级字段; Unit扩展招商字段; 新增LeasingPlan/MarketNews/MockBusinessData模型
- **后端API**: 新增dashboard聚合API(7个端点); plans CRUD; news CRUD
- **前端页面**: /dashboard主驾驶舱; /dashboard/tools/* 工具页面; /dashboard/plans 计划管理; /dashboard/news 资讯
- **前端组件**: KPICard, KanbanBoard(拖拽), 3个Recharts图表, ExpiringContractsTable, PlanProgressTable, FilterBar
- **依赖**: 新增@hello-pangea/dnd拖拽库
```

**Step 3: 最终构建验证**

```bash
# 重建前端
docker compose -f docker/docker-compose.yml up -d --build frontend

# 重启后端
docker restart camp-backend

# 验证
# 1. 打开 http://localhost:3201/dashboard
# 2. 确认 6 个 KPI 卡片显示数据
# 3. 确认 3 个图表渲染正确
# 4. 确认看板可拖拽
# 5. 确认到期合同表格有数据
# 6. 确认工具页面可访问
# 7. 确认计划 CRUD 可用
# 8. 确认资讯 CRUD 可用
```

**Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: complete Kanban Dashboard integration (v0.1.14)"
```

---

## 任务依赖关系图

```
Task 1 (Tenant扩展) ──────────────────────────────┐
Task 2 (Unit扩展) ─────────────────────────────────┤
Task 3 (LeasingPlan模型) ──────────────────────────┤
Task 4 (MarketNews模型) ───────────────────────────┤──→ Task 6 (种子数据)
Task 5 (MockBizData模型) ──────────────────────────┘         │
                                                              ↓
Task 7 (Dashboard Schema) ──┐                                │
Task 8 (Plan+News Schema) ──┤→ Task 9 (Dashboard API) ←──────┘
                            │→ Task 10 (Plans API)
                            │→ Task 11 (News API)
                            ↓
                      Task 12 (前端基础: 依赖安装 + API客户端 + 类型)
                            ↓
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
        Task 13        Task 14       Task 15 (3个图表)
        (KPICard)    (ChartWrapper)
              ↓             ↓             ↓
              └─────────────┼─────────────┘
                            ↓
                   Task 16 (Kanban看板 - 核心)
                            ↓
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
        Task 17        Task 18       Task 19 (主页面)
        (两个表格)    (FilterBar)        ↓
                            ↓         Task 20 (4个工具页)
                            ↓              ↓
                      Task 21 (计划页)   Task 22 (集成+收尾)
```

## 验收 Checklist（Q2 完成）

- [ ] 主驾驶舱 `/dashboard` 正常加载，6 个 KPI 卡片显示正确数值和环比
- [ ] 空铺结构饼图按时长分组正确渲染
- [ ] 租约期限柱状图按年限分组正确渲染
- [ ] 品牌能级环形图显示正确的 S/A/B/C/lianfa 分布
- [ ] 招商状态看板按 status 分列显示铺位卡片
- [ ] 拖拽卡片到其他列后状态正确更新（调用 API）
- [ ] 即将到期合同表格显示 30 天内到期的合同
- [ ] 招商计划进度表显示计划和进度条
- [ ] 品牌查询页支持搜索和能级筛选
- [ ] 铺位查询页支持多维筛选并可跳转平面图
- [ ] 项目信息查询页展示 Mall 全貌摘要
- [ ] 市场资讯支持发布和管理
- [ ] 招商计划支持完整 CRUD 和状态流转
- [ ] Docker 一键部署成功，无需本地依赖
