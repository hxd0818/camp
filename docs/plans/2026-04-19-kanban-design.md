# 招商业务驾驶舱（Kanban Dashboard）设计文档

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 为 CAMP 商业资产管理平台构建完整的招商业务驾驶舱，包含质量监控、工具赋能、计划管控、市场资讯四大模块，实现数据驱动的招商管理。

**架构:** 混合模式 — 主驾驶舱页面（KPI + 图表 + 招商状态看板）+ 点击下钻到子页面。单商场维度，模拟经营数据先行，Recharts 图表，@hello-pangea/dnd 拖拽看板。

**Tech Stack:** Next.js 14 (App Router) + FastAPI + PostgreSQL + Recharts + @hello-pangea/dnd + Tailwind CSS

---

## 一、需求背景

### 1.1 痛点（来自需求文档）

1. **数据汇总慢**：无法实时调阅招商业务洽谈所需的综合数据
2. **缺乏数据支撑**：无法实时查看招商进度、招商质量等多维度数据
3. **系统间割裂**：需专人从多个系统下载、汇总、匹配数据
4. **品牌信息难掌握**：品牌和项目经营状况获取困难

### 1.2 目标

搭建标准化、可视化的招商业务驾驶舱，实现数据的实时输出，驱动高效招商。

### 1.3 设计决策记录

| 决策项 | 结论 | 理由 |
|--------|------|------|
| 组织架构 | 单商场模式 | CAMP 当前只有 Mall 一级，不做集团/大区/城市公司层级 |
| 经营数据 | 模拟数据先行 | 客流/销售/坪效等数据需外部系统接入，Q2-Q3 用 MockBizData 模拟 |
| 品牌能级 | Tenant 模型新增 brand_tier 字段 | 轻量扩展，无需新建 Brand 模型 |
| 架构方案 | 混合模式（概览+下钻） | 兼顾全局视野和深度分析，用户体验最佳 |
| 实施范围 | 全量设计 + 分阶段实施 | 4 个模块完整设计，按 Q2/Q3/Q4 分阶段交付 |

---

## 二、整体架构

### 2.1 技术选型

| 层 | 技术 | 说明 |
|----|------|------|
| 图表可视化 | Recharts ^2.12.0 | 已安装，支持柱状图/饼图/折线图/面积图 |
| 拖拽看板 | @hello-pangea/dnd | React 拖拽库，替代 react-beautiful-dnd（已停更） |
| 布局样式 | Tailwind CSS | 现有技术栈一致 |
| 表格组件 | 原生 Table + Tailwind | 轻量，不需要引入 Ant Design |
| 状态管理 | React Hooks | useState/useEffect，暂不需全局状态 |
| 后端聚合 | SQLAlchemy func | 使用 SQL 聚合函数计算 KPI |

### 2.2 路由设计

```
前端路由:
/dashboard                          → 主驾驶舱页（新页面）
/dashboard/tools/brands             → 品牌信息查询
/dashboard/tools/units              → 铺位资源查询
/dashboard/tools/projects           → 项目信息查询
/dashboard/plans                    → 招商计划管控
/dashboard/news                     → 市场资讯

后端 API:
GET  /api/v1/dashboard/stats        → 核心指标聚合统计
GET  /api/v1/dashboard/vacancy      → 空铺结构分析
GET  /api/v1/dashboard/lease-term   → 租约期限分布
GET  /api/v1/dashboard/brand-tier   → 品牌能级分析
GET  /api/v1/dashboard/expiring     → 即将到期合同列表
GET  /api/v1/dashboard/kanban       → 招商状态看板数据
POST /api/v1/dashboard/kanban/move → 更新铺位状态（拖拽）
CRUD /api/v1/plans                  → 招商计划管理
CRUD /api/v1/news                   → 市场资讯管理
GET  /api/v1/tools/units            → 铺位多维筛选查询
GET  /api/v1/tools/brands           → 品牌多维筛选查询
GET  /api/v1/tools/projects         → 项目综合信息查询
```

### 2.3 目录结构

```
frontend/
├── app/
│   └── dashboard/
│       ├── page.tsx                    → 主驾驶舱页
│       ├── layout.tsx                  → 驾驶舱共享布局
│       ├── tools/
│       │   ├── brands/page.tsx         → 品牌查询
│       │   ├── units/page.tsx          → 铺位查询
│       │   └── projects/page.tsx       → 项目查询
│       ├── plans/
│       │   └── page.tsx                → 招商计划
│       └── news/
│           └── page.tsx                → 市场资讯
├── components/
│   └── dashboard/
│       ├── KPICard.tsx                 → 指标卡片组件
│       ├── KanbanBoard.tsx             → 招商状态看板（拖拽）
│       ├── KanbanColumn.tsx            → 看板列容器
│       ├── KanbanCard.tsx              → 看板卡片（铺位）
│       ├── ChartWrapper.tsx            → 图表容器（统一 loading/empty）
│       ├── VacancyPieChart.tsx         → 空铺结构饼图
│       ├── LeaseTermBarChart.tsx       → 租约期限柱状图
│       ├── BrandTierDonut.tsx          → 品牌能级环形图
│       ├── ExpiringContractsTable.tsx  → 即将到期合同表格
│       ├── PlanProgressTable.tsx       → 计划进度表格
│       ├── FilterBar.tsx               → 全局筛选栏
│       └── StatTrendChart.tsx          → 指标趋势折线图（Q3）
└── lib/
    └── dashboard-api.ts                → 看板专用 API 方法

backend/
├── app/
│   ├── api/v1/
│   │   ├── dashboard.py                → 驾驶舱聚合 API（新建）
│   │   ├── plans.py                    → 招商计划 CRUD（新建）
│   │   └── news.py                     → 市场资讯 CRUD（新建）
│   ├── models/
│   │   ├── tenant.py                   → 扩展: brand_tier, is_flagship, is_first_entry
│   │   ├── unit.py                     → 扩展: vacancy_days, leasing_type
│   │   ├── leasing_plan.py             → 新建: 招商计划模型
│   │   ├── market_news.py              → 新建: 市场资讯模型
│   │   └── mock_business_data.py       → 新建: 模拟经营数据模型
│   └── schemas/
│       ├── dashboard.py                → 新建: 驾驶舱响应 Schema
│       ├── plan.py                     → 新建: 计划 Schema
│       └── news.py                     → 新建: 资讯 Schema
└── scripts/
    └── seed_dashboard_data.py          → 新建: 驾驶舱种子数据（含模拟经营数据）
```

---

## 三、数据模型变更

### 3.1 现有模型扩展

#### Tenant 模型扩展

```python
# backend/app/models/tenant.py 变更

class BrandTier(str, Enum):
    S = "s"              # 核心品牌（S级）
    A = "a"              # 重点品牌（A级）
    B = "b"              # 成长品牌（B级）
    C = "c"              # 基础品牌（C级）
    LIANFA = "lianfa"    # 联发品牌
    UNKNOWN = "unknown"  # 未分级

# Tenant 模型新增字段：
brand_tier: Mapped[BrandTier | None]      # 品牌能级
is_flagship: Mapped[bool | None] = False  # 是否旗舰店/高标店
is_first_entry: Mapped[bool | None] = False  # 是否首进品牌
```

#### Unit 模型扩展

```python
# backend/app/models/unit.py 变更

# Unit 模型新增字段：
vacancy_days: Mapped[int | None] = None   # 空置天数
leasing_type: Mapped[str | None] = None   # 招商类型: new/renewal/adjustment
```

### 3.2 全新模型

#### LeasingPlan（招商计划）

```python
# backend/app/models/leasing_plan.py (新建)

class PlanType(str, Enum):
    ADJUSTMENT = "adjustment"    # 招调计划
    SPECIAL = "special"          # 专项计划（联发品牌提升、首店引入等）

class PlanStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class LeasingPlan(Base):
    __tablename__ = "leasing_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mall_id: Mapped[int] = mapped_column(ForeignKey("malls.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    plan_type: Mapped[PlanType] = mapped_column(default=PlanType.ADJUSTMENT)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 目标指标
    target_area: Mapped[float | None] = mapped_column(nullable=True)      # 目标面积(㎡)
    target_units: Mapped[int | None] = mapped_column(nullable=True)       # 目标铺位数

    # 完成情况
    completed_area: Mapped[float] = mapped_column(Float, default=0)       # 已完成面积
    completed_units: Mapped[int] = mapped_column(Integer, default=0)      # 已完成铺位数

    # 状态与时间
    status: Mapped[PlanStatus] = mapped_column(default=PlanStatus.DRAFT)
    owner: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 负责人
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now())
```

#### MarketNews（市场资讯）

```python
# backend/app/models/market_news.py (新建)

class NewsCategory(str, Enum):
    INDUSTRY = "industry"    # 行业动态
    POLICY = "policy"        # 政策法规
    GROUP = "group"          # 集团资讯

class MarketNews(Base):
    __tablename__ = "market_news"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mall_id: Mapped[int | None] = mapped_column(ForeignKey("malls.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(200), nullable=True)  # 来源
    category: Mapped[NewsCategory] = mapped_column(default=NewsCategory.INDUSTRY)
    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now())
```

#### MockBusinessData（模拟经营数据）

```python
# backend/app/models/mock_business_data.py (新建)
# Q2-Q3 阶段用于模拟真实经营数据，后续替换为真实数据源

class MockBusinessData(Base):
    __tablename__ = "mock_business_data"

    id: Mapped[int] = mapped_column(primary_key=True)
    mall_id: Mapped[int] = mapped_column(ForeignKey("malls.id"), nullable=False)
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id"), nullable=True)
    tenant_id_ref: Mapped[int | None] = mapped_column(ForeignKey("tenants.id"), nullable=True)
    data_date: Mapped[date] = mapped_column(Date, nullable=False)  # 数据日期

    # 经营指标
    daily_traffic: Mapped[int | None] = mapped_column(Integer, nullable=True)       # 日客流
    daily_sales: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)  # 日销售额
    monthly_sales: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True) # 月销售额
    sales_per_sqm: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)  # 销售坪效
    rent_to_sales_ratio: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)  # 租售比(%)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

---

## 四、Module 01 — 招商质量监控详细设计

### 4.1 主驾驶舱页面布局

```
┌─────────────────────────────────────────────────────────────────────┐
│  招商业务驾驶舱                              [▼ 阳光广场] [本月 ▼] │
├──────┬──────┬──────┬──────┬──────┬─────────────────────────────────┤
│出租率 │空置面│月租金│到期合│招商完│联发品牌                           │
│ 85%  │1200㎡│128万│ 12个 │ 67%  │ 18%                               │
│ ↑2.3%│ ↓5%  │ ↑8% │ 30天内│ 按时  │ ↑3%                              │
├──────┴──────┴──────┴──────┴──────┴─────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │   空铺结构        │  │   租约期限分布    │  │   品牌能级分布    │   │
│  │   [PieChart]     │  │   [BarChart]     │  │   [DonutChart]   │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  招商状态看板 (Kanban Board)                                 │   │
│  │  [全部楼层 ▼] [搜索铺位...]                                  │   │
│  ├─────────────┬─────────────┬─────────────┬───────────────────┤   │
│  │  空置 (8)   │  洽谈中 (3)  │  已签约 (4)  │  已入驻 (12)      │   │
│  │  520 m²     │  240 m²     │  680 m²     │  2,160 m²         │   │
│  ├─────────────┼─────────────┼─────────────┼───────────────────┤   │
│  │ [KanbanCard]│ [KanbanCard]│ [KanbanCard]│ [KanbanCard]      │   │
│  │ [KanbanCard]│ [KanbanCard]│ [KanbanCard]│ [KanbanCard]      │   │
│  │ ...         │ ...         │ ...         │ ...               │   │
│  └─────────────┴─────────────┴─────────────┴───────────────────┘   │
│                                                                     │
│  ┌────────────────────────┐  ┌───────────────────────────────────┐  │
│  │  即将到期合同 TOP10     │  │  招商计划进度                      │  │
│  │  [ExpiringTable]       │  │  [PlanProgressTable]              │  │
│  └────────────────────────┘  └───────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 KPI 卡片规格

每个 KPICard 组件接收：

```typescript
interface KPICardProps {
  title: string;           // 指标名称
  value: string | number;  // 当前值
  unit?: string;           // 单位（%, m², 万, 个等）
  change: number;          // 环比变化百分比（正=上升，负=下降）
  period?: string;         // 对比周期（月环比/日环比）
  color: string;           // 主题色
  onClick?: () => void;    // 点击下钻回调
  loading?: boolean;
}
```

6 个 KPI 的数据来源和计算逻辑：

| KPI | API 字段 | 计算逻辑 |
|-----|---------|---------|
| 出租率 | `occupancy_rate` | `COUNT(units WHERE status='occupied') / COUNT(*) * 100` |
| 空置面积 | `vacant_area` | `SUM(units.gross_area WHERE status='vacant')` |
| 月租金收入 | `monthly_revenue` | `SUM(contracts.monthly_rent WHERE status='active')` |
| 即将到期 | `expiring_count` | `COUNT(contracts WHERE lease_end BETWEEN today AND today+30)` |
| 招商完成率 | `leasing_completion` | `(occupied + signed) / total * 100` （signed 需从 plan 推断或用 reserved） |
| 联发占比 | `lianfa_ratio` | `COUNT(tenants WHERE brand_tier='lianfa' AND 有活跃合同) / COUNT(有活跃合同的 tenants)` |

### 4.3 招商状态看板（KanbanBoard）详细规格

#### 数据结构

```typescript
interface KanbanData {
  columns: KanbanColumn[];
}

interface KanbanColumn {
  id: UnitStatus;           // 'vacant' | 'reserved' | 'occupied' | ...
  title: string;            // '空置' | '洽谈中' | '已签约' | '已入驻'
  unitCount: number;
  totalArea: number;        // 平方米
  cards: KanbanCard[];
}

interface KanbanCard {
  unitId: number;
  unitCode: string;         // A-102
  area: number;             // 面积
  floorName: string;        // L1
  layoutType: string;       // 业态
  tenantName?: string;      // 当前租户（如有）
  brandTier?: string;       // 品牌能级
  vacancyDays?: number;     // 空置天数
  monthlyRent?: number;     // 月租金
}
```

#### 列定义

| 列 ID | 列名 | 对应 Unit.status | 可拖入 | 可拖出 |
|-------|------|------------------|--------|--------|
| vacant | 空置 | vacant | - | → reserved, → occupied |
| reserved | 洽谈中/预留 | reserved | ← vacant | → occupied |
| occupied | 已入驻 | occupied | ← reserved, ← vacant | - |

> 注：实际 status 流转需结合业务规则。拖拽操作调用 `PUT /api/v1/dashboard/kanban/move` 更新 `unit.status`。

#### 拖拽交互

使用 @hello-pangea/dnd：
- 同一列内卡片可排序（调整优先级）
- 跨列拖拽 = 状态变更
- 拖拽结束后显示确认 Toast（"A-102 状态已变更为 洽谈中"）
- 拖拽时显示半透明预览

### 4.4 图表规格

#### VacancyPieChart（空铺结构饼图）

```typescript
// 数据格式
interface VacancyData {
  name: string;    // '短期(<90天)' | '中期(90-180天)' | '长期(180-365天)' | '超长期(≥365天)'
  value: number;   // 面积（㎡）
  count: number;   // 铺位数量
  color: string;
}
```

Recharts 配置：`<PieChart>` + `<Pie>` (innerRadius=60 形成环形)，图例在右侧。

#### LeaseTermBarChart（租约期限分布）

```typescript
interface LeaseTermData {
  term: string;    // '1年以下' | '1-2年' | '2-3年' | '3-5年' | '5年以上'
  count: number;   // 合同数量
  area: number;    // 总面积
}
```

Recharts 配置：`<BarChart>` + `<Bar>` + `<XAxis>` + `<YAxis>` + `<Tooltip>`。

#### BrandTierDonut（品牌能级分布）

```typescript
interface BrandTierData {
  name: string;    // 'S级' | 'A级' | 'B级' | 'C级' | '联发'
  value: number;   // 数量
  color: string;
  percentage: number;
}
```

Recharts 配置：`<PieChart>` + `<Pie>` (环形)，中心显示总数量。

---

## 五、Module 02 — 招商工具赋能详细设计

### 5.1 品牌信息查询 (`/dashboard/tools/brands`)

**页面功能：**
- 顶部搜索框（品牌名称模糊搜索）
- 筛选器行：品牌能级、业态类型、合作状态
- 结果区域：表格展示（可切换为卡片视图）
- 支持多选对比（勾选 2-3 个品牌后显示对比面板）

**表格列：**
| 品牌名称 | 能级 | 类型 | 合作铺位数 | 总面积(㎡) | 月租金总额 | 状态 | 操作 |
|---------|------|------|-----------|-----------|-----------|------|------|
| 星巴克 | S | 餐饮 | 2 | 220 | ¥33,000 | 在营 | 详情 |

**对比面板（侧滑出）：**
- 并排展示选中品牌的各项指标对比
- 差异高亮显示（最高值绿色，最低值红色）

### 5.2 铺位资源查询 (`/dashboard/tools/units`)

**多维筛选器：**
```
行1: [楼宇 ▼] [楼层 ▼] [铺位类型 ▼] [状态 ▼]
行2: [面积范围: ___ - ___ m²] [租费范围: ___ - ___ 元/m²/月]
行3: [□ 新招] [□ 续约] [□ 调整]
```

**结果展示：**
- 默认表格视图：铺位号、楼层、面积、类型、状态、现品牌、月租金、操作
- 切换卡片视图：视觉化铺位卡片网格
- **关键交互**：每行的「定位」按钮点击后跳转到 `/malls/{id}/floors/{floorId}` 并高亮对应铺位

### 5.3 项目信息查询 (`/dashboard/tools/projects`)

以当前 Mall 为维度，展示项目全貌：

**信息卡片区（Grid 2×2）：**
| 基础信息 | 经营摘要 |
|---------|---------|
| 开业时间、城市级别 | 年租金收入、坪效 |
| 商业体量、可租赁面积 | 出租率、铺位总数 |
| 楼宇数、总楼层数 | 租户数、平均租期 |

| 品牌结构 | 铺位结构 |
|---------|---------|
| S/A/B/C 各级数量和占比 | 各楼层在营/空置数量 |
| 联发品牌数量 | 年内到期预警铺位 |

### 5.4 市场资讯 (`/dashboard/news`)

简单的 CMS 功能：
- 文章列表：标题、分类标签、来源、发布时间、状态（已发布/草稿）
- 文章详情：富文本内容展示
- 发布/编辑/删除（需权限控制，Q4 完善）

---

## 六、Module 03 — 招商计划管控详细设计

### 6.1 计划列表

**功能：**
- 创建计划（弹窗表单）：名称、类型、目标面积/铺位数、负责人、起止日期
- 编辑计划（同上表单，回填数据）
- 删除计划（二次确认）
- 状态流转按钮：草稿→激活→进行中→已完成/逾期/取消

**表格列：**
| 计划名称 | 类型 | 目标 | 已完成 | 进度 | 负责人 | 截止日 | 状态 | 操作 |
|---------|------|------|--------|------|--------|--------|------|------|
| Q2 招商调整 | 调整 | 2000m² | 1200m² | 60% | 张三 | 06-30 | 进行中 | 编辑/完成 |
| S级引入 | 专项 | 500m² | 300m² | 60% | 李四 | 06-30 | 进行中 | 编辑/完成 |

**进度条：** 每行内嵌一个窄进度条，颜色随状态变化（进行中=蓝，逾期=红，完成=绿）。

### 6.2 计划详情（点击展开）

- 关联的铺位列表（哪些铺位通过此计划完成招商）
- 关联的合同列表
- 操作日志（状态变更历史）

---

## 七、API 设计详细规格

### 7.1 驾驶舱聚合 API (`/api/v1/dashboard/stats`)

**请求：** `GET /api/v1/dashboard/stats?mall_id=1`

**响应：**
```json
{
  "mall_id": 1,
  "mall_name": "阳光广场",
  "period": "2026-04",
  "kpis": {
    "occupancy_rate": { "value": 85.0, "change": 2.3, "unit": "%" },
    "vacant_area": { "value": 1200, "change": -5.0, "unit": "m²" },
    "monthly_revenue": { "value": 1280000, "change": 8.0, "unit": "元" },
    "expiring_count": { "value": 12, "change": null, "unit": "个" },
    "leasing_completion": { "value": 67.0, "change": 5.0, "unit": "%" },
    "lianfa_ratio": { "value": 18.0, "change": 3.0, "unit": "%" }
  },
  "summary": {
    "total_units": 27,
    "occupied_units": 23,
    "vacant_units": 4,
    "total_area": 4560,
    "leased_area": 3360,
    "total_tenants": 20,
    "active_contracts": 23
  }
}
```

### 7.2 看板数据 API (`/api/v1/dashboard/kanban`)

**请求：** `GET /api/v1/dashboard/kanban?mall_id=1&floor_id=&status=`

**响应：**
```json
{
  "columns": [
    {
      "id": "vacant",
      "title": "空置",
      "unit_count": 4,
      "total_area": 520,
      "cards": [
        {
          "unit_id": 5,
          "unit_code": "A-102",
          "area": 50,
          "floor_name": "L1",
          "layout_type": "retail",
          "vacancy_days": 45,
          "tenant_name": null
        }
      ]
    },
    {
      "id": "occupied",
      "title": "已入驻",
      "unit_count": 23,
      "total_area": 3840,
      "cards": [
        {
          "unit_id": 1,
          "unit_code": "D-402",
          "area": 60,
          "floor_name": "L4",
          "layout_type": "retail",
          "tenant_name": "ZARA",
          "brand_tier": "A",
          "monthly_rent": 18000
        }
      ]
    }
  ]
}
```

### 7.3 拖拽状态更新 API (`/api/v1/dashboard/kanban/move`)

**请求：** `PUT /api/v1/dashboard/kanban/move`

```json
{
  "unit_id": 5,
  "new_status": "reserved"
}
```

**响应：** `200 { "unit_id": 5, "old_status": "vacant", "new_status": "reserved" }`

### 7.4 其他新增 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/dashboard/vacancy?mall_id=` | 空铺结构分析（按时长分组） |
| GET | `/api/v1/dashboard/lease-term?mall_id=` | 租约期限分布 |
| GET | `/api/v1/dashboard/brand-tier?mall_id=` | 品牌能级分布 |
| GET | `/api/v1/dashboard/expiring?mall_id=&days=30` | 即将到期合同列表 |
| CRUD | `/api/v1/plans` | 招商计划完整 CRUD |
| CRUD | `/api/v1/news` | 市场资讯完整 CRUD |
| GET | `/api/v1/tools/units?mall_id=&...` | 铺位多维筛选（复用现有 /units 扩展参数） |
| GET | `/api/v1/tools/brands?mall_id=&...` | 品牌多维筛选 |
| GET | `/api/v1/tools/projects?mall_id=` | 项目综合信息 |

---

## 八、分阶段实施计划

### Q2（4-6月）— 基础功能

**目标：** 达到基础数据的查阅功能

**Phase 2.1 — 数据基础（第1-2周）**
- [ ] Tenant 模型扩展（brand_tier, is_flagship, is_first_entry）
- [ ] Unit 模型扩展（vacancy_days, leasing_type）
- [ ] 新建 LeasingPlan 模型 + Alembic 迁移
- [ ] 新建 MarketNews 模型 + Alembic 迁移
- [ ] 新建 MockBusinessData 模型 + Alembic 迁移
- [ ] 种子数据脚本（seed_dashboard_data.py）— 含模拟经营数据和品牌分级

**Phase 2.2 — 后端 API（第2-3周）**
- [ ] 驾驶舱聚合 API（stats, kanban, vacancy, lease-term, brand-tier, expiring）
- [ ] 拖拽状态更新 API（kanban/move）
- [ ] 招商计划 CRUD API（plans）
- [ ] 市场资讯 CRUD API（news）
- [ ] 铺位多维筛选 API 扩展（tools/units）
- [ ] 品牌查询 API（tools/brands）
- [ ] 项目信息查询 API（tools/projects）

**Phase 2.3 — 前端主驾驶舱（第3-4周）**
- [ ] 驾驶舱页面骨架（layout + FilterBar）
- [ ] 6 个 KPI 卡片组件（KPICard）
- [ ] 3 个图表组件（VacancyPie, LeaseTermBar, BrandTierDonut）
- [ ] 招商状态看板（KanbanBoard + 拖拽）
- [ ] 即将到期合同表格（ExpiringContractsTable）
- [ ] 招商计划进度表（PlanProgressTable）
- [ ] 安装并配置 @hello-pangea/dnd

**Phase 2.4 — 工具页面（第4-5周）**
- [ ] 品牌信息查询页面（/dashboard/tools/brands）
- [ ] 铺位资源查询页面（/dashboard/tools/units）
- [ ] 项目信息查询页面（/dashboard/tools/projects）
- [ ] 市场资讯页面（/dashboard/news）

**Phase 2.5 — 集成测试与优化（第5-6周）**
- [ ] 端到端流程测试
- [ ] 性能优化（聚合查询缓存）
- [ ] 导航集成（首页添加驾驶舱入口）
- [ ] Docker 部署验证

### Q3（7-9月）— 分析判断功能

**目标：** 手机端应用、风险提示、健康度趋势预测

**Phase 3.1 — 数据对比**
- [ ] 多品牌数据对比输出
- [ ] 多项目数据对比输出
- [ ] 同比/环比趋势图

**Phase 3.2 — 预警提示**
- [ ] 合同到期自动预警（邮件/站内信）
- [ ] 空置超期预警（90天/180天/365天阈值）
- [ ] 招商计划逾期预警
- [ ] 品牌能级失衡预警（C级占比过高）

**Phase 3.3 — 任务提示**
- [ ] 到期/预警招调计划到期提醒仪表盘
- [ ] 待办事项 Widget

**Phase 3.4 — 功能完善**
- [ ] Q2 基础功能的 Bug 修复和体验优化
- [ ] 响应式适配（平板/手机端）

### Q4（10-12月）— 稳定完善

**目标：** 优化完善、升级功能、稳定使用

**Phase 4.1 — 移动端应用**
- [ ] PWA 支持 or 响应式移动端优化
- [ ] 核心功能移动端可用

**Phase 4.2 — 数据报告**
- [ ] 项目维度的 PDF/Excel 报告导出
- [ ] 品牌维度的数据报告生成
- [ ] 定时报送功能

**Phase 4.3 — 市场资讯增强**
- [ ] 资讯发布与管理后台完善
- [ ] 资讯推荐算法（基于用户关注领域）

**Phase 4.4 — 系统稳定化**
- [ ] 全面性能优化
- [ ] 监控告警接入
- [ ] 用户权限细化（Q4 重点）

---

## 九、关键技术实现要点

### 9.1 聚合查询性能

驾驶舱 API 需要大量聚合计算。优化策略：

1. **SQL 层聚合**：使用 `func.count()`, `func.sum()`, `func.avg()` 在数据库层完成计算
2. **索引保障**：确保 `status`, `mall_id`, `lease_end` 等筛选字段有索引
3. **缓存策略**：KPI 数据缓存 5 分钟（Redis），用户触发刷新时才重新计算
4. **并行查询**：6 个 KPI 使用 `asyncio.gather()` 并行查询

### 9.2 拖拽看板实现

```typescript
// @hello-pangea/dnd 核心用法
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function KanbanBoard({ data, onDragEnd }) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {data.columns.map(col => (
        <Droppable droppableId={col.id} key={col.id}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {col.cards.map((card, index) => (
                <Draggable draggableId={String(card.unitId)} index={index} key={card.unitId}>
                  {(provided) => <KanbanCard card={card} provided={provided} />}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ))}
    </DragDropContext>
  );
}
```

### 9.3 Recharts 图表统一封装

所有图表通过 ChartWrapper 统一处理 loading/empty/error 状态：

```typescript
function ChartWrapper({ 
  title, 
  children, 
  loading, 
  emptyText = '暂无数据',
  className 
}: ChartWrapperProps) {
  if (loading) return <ChartSkeleton />;
  // ... 统一的 empty 和 error 处理
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}
```

---

## 十、风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 聚合查询性能差 | 页面加载慢 | 中 | Redis 缓存 + SQL 优化 + 并行查询 |
| 拖拽体验不流畅 | 用户不满 | 低 | @hello-pangea/dnd 成熟稳定 + 虚拟滚动 |
| 模拟数据与真实数据差异大 | 后续切换成本 | 中 | MockBizData 模型独立，替换时只改数据源层 |
| 图表库定制能力不足 | UI 还原度低 | 低 | Recharts 可定制性强，支持自定义 SVG |
| 看板页面代码过大 | 维护困难 | 中 | 组件拆分清晰，单个文件 <300 行 |

---

## 十一、验收标准

### Q2 验收标准

- [ ] 主驾驶舱页面正常加载，6 个 KPI 卡片显示正确数值
- [ ] 3 个图表（饼图、柱状图、环形图）正确渲染
- [ ] 招商状态看板可拖拽移动铺位卡片，状态正确更新
- [ ] 即将到期合同表格展示正确的到期数据
- [ ] 品牌查询页面支持筛选和搜索
- [ ] 铺位查询页面支持多维筛选，可跳转平面图
- [ ] 项目信息查询展示完整的 Mall 概览
- [ ] 招商计划支持完整 CRUD 和状态流转
- [ ] 市场资讯支持发布和管理
- [ ] Docker 环境一键部署成功
