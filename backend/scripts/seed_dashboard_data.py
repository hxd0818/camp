"""Seed data script for CAMP Dashboard Kanban features.

Usage (inside container):
    python scripts/seed_dashboard_data.py
"""

import asyncio
import random
import sys
from datetime import date, timedelta, datetime
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.mall import Mall
from app.models.tenant import Tenant, BrandTier
from app.models.unit import Unit, UnitStatus
from app.models.contract import Contract, ContractStatus
from app.models.leasing_plan import LeasingPlan, PlanType, PlanStatus
from app.models.market_news import MarketNews, NewsCategory
from app.models.mock_business_data import MockBusinessData


def random_brand_tier() -> BrandTier:
    """Return brand tier with distribution: S=10%, A=25%, B=35%, C=20%, lianfa=10%."""
    rand = random.random()
    if rand < 0.10:
        return BrandTier.S
    elif rand < 0.35:  # 10% + 25%
        return BrandTier.A
    elif rand < 0.70:  # 35% + 35%
        return BrandTier.B
    elif rand < 0.90:  # 70% + 20%
        return BrandTier.C
    else:
        return BrandTier.LIANFA


async def seed():
    """Create dashboard seed data for Kanban features."""
    async with AsyncSessionLocal() as db:
        # Get the first mall (Sunshine Plaza)
        mall_result = await db.execute(select(Mall).limit(1))
        mall = mall_result.scalar_one_or_none()

        if not mall:
            print("Error: No mall found. Please run seed_data.py first.")
            return

        print(f"Using mall: {mall.name} (id={mall.id})")

        # ========== a) Update Tenant brand_tier ==========
        print("\n1. Updating Tenant brand_tier...")
        tenants_result = await db.execute(select(Tenant))
        tenants = tenants_result.scalars().all()

        if not tenants:
            print("  No tenants found. Skipping.")
        else:
            for tenant in tenants:
                tenant.brand_tier = random_brand_tier()

                # Set is_flagship for some S-tier tenants
                if tenant.brand_tier == BrandTier.S:
                    tenant.is_flagship = random.random() < 0.7  # 70% of S-tier are flagship
                else:
                    tenant.is_flagship = False

                # Set is_first_entry for some A-tier tenants
                if tenant.brand_tier == BrandTier.A:
                    tenant.is_first_entry = random.random() < 0.3  # 30% of A-tier are first entry
                else:
                    tenant.is_first_entry = False

            print(f"  Updated {len(tenants)} tenants")

        # ========== b) Update Unit vacancy_days and leasing_type ==========
        print("\n2. Updating Unit vacancy_days and leasing_type...")
        units_result = await db.execute(select(Unit))
        units = units_result.scalars().all()

        if not units:
            print("  No units found. Skipping.")
        else:
            for unit in units:
                if unit.status == UnitStatus.VACANT:
                    # Set vacancy_days for vacant units
                    unit.vacancy_days = random.randint(15, 200)
                    unit.leasing_type = "new"
                elif unit.status == UnitStatus.OCCUPIED:
                    # Set leasing_type for occupied units
                    unit.leasing_type = random.choice(["new", "renewal", "adjustment"])
                    unit.vacancy_days = 0
                else:
                    unit.leasing_type = None
                    unit.vacancy_days = None

            print(f"  Updated {len(units)} units")

        # ========== c) Create LeasingPlan records ==========
        print("\n3. Creating LeasingPlan records...")
        today = date.today()

        leasing_plans = [
            # DRAFT plan - Q2招商调整
            LeasingPlan(
                mall_id=mall.id,
                name="Q2招商调整计划",
                plan_type=PlanType.ADJUSTMENT,
                description="针对二楼餐饮业态进行调整，引入网红餐饮品牌",
                target_area=800.0,
                target_units=5,
                completed_area=0,
                completed_units=0,
                status=PlanStatus.DRAFT,
                owner="招商经理-张三",
                start_date=today + timedelta(days=7),
                due_date=today + timedelta(days=90),
                notes="需审批后启动",
            ),
            # ACTIVE plan - S级品牌引入
            LeasingPlan(
                mall_id=mall.id,
                name="S级品牌引入计划",
                plan_type=PlanType.SPECIAL,
                description="引入3个S级国际品牌，提升商场定位",
                target_area=500.0,
                target_units=3,
                completed_area=120.0,
                completed_units=1,
                status=PlanStatus.ACTIVE,
                owner="招商总监-李四",
                start_date=today - timedelta(days=30),
                due_date=today + timedelta(days=60),
                notes="已签约1家，正在洽谈2家",
            ),
            # IN_PROGRESS plan - 空铺去化专项
            LeasingPlan(
                mall_id=mall.id,
                name="空铺去化专项行动",
                plan_type=PlanType.SPECIAL,
                description="针对现有空铺进行专项招商，目标Q3完成",
                target_area=450.0,
                target_units=8,
                completed_area=180.0,
                completed_units=3,
                status=PlanStatus.IN_PROGRESS,
                owner="招商经理-王五",
                start_date=today - timedelta(days=15),
                due_date=today + timedelta(days=45),
                notes="已签约3家，剩余5家正在洽谈",
            ),
            # COMPLETED plan - Q1招商计划
            LeasingPlan(
                mall_id=mall.id,
                name="Q1招商计划",
                plan_type=PlanType.ADJUSTMENT,
                description="Q1季度招商调整计划",
                target_area=600.0,
                target_units=6,
                completed_area=600.0,
                completed_units=6,
                status=PlanStatus.COMPLETED,
                owner="招商经理-张三",
                start_date=today - timedelta(days=120),
                due_date=today - timedelta(days=30),
                notes="已完成，全部签约",
            ),
            # OVERDUE plan - 临期品牌调整
            LeasingPlan(
                mall_id=mall.id,
                name="临期品牌调整计划",
                plan_type=PlanType.ADJUSTMENT,
                description="针对即将到期合同的品牌进行调整",
                target_area=350.0,
                target_units=4,
                completed_area=100.0,
                completed_units=1,
                status=PlanStatus.OVERDUE,
                owner="招商经理-赵六",
                start_date=today - timedelta(days=60),
                due_date=today - timedelta(days=7),
                notes="已超期，需加快进度",
            ),
        ]

        for plan in leasing_plans:
            db.add(plan)

        print(f"  Created {len(leasing_plans)} leasing plans")

        # ========== d) Create MarketNews records ==========
        print("\n4. Creating MarketNews records...")

        market_news = [
            # Industry news - published
            MarketNews(
                mall_id=mall.id,
                title="2024年商业地产趋势报告发布",
                content="根据最新报告，体验式消费成为新趋势，餐饮、娱乐业态占比持续提升...",
                source="商业地产观察",
                category=NewsCategory.INDUSTRY,
                is_published=True,
                published_at=datetime.now() - timedelta(days=3),
            ),
            # Policy news - published
            MarketNews(
                mall_id=mall.id,
                title="商务部发布促消费新政策",
                content="商务部发布新一轮促消费政策，支持商业综合体开展各类促销活动...",
                source="商务部官网",
                category=NewsCategory.POLICY,
                is_published=True,
                published_at=datetime.now() - timedelta(days=7),
            ),
            # Group news - published
            MarketNews(
                mall_id=mall.id,
                title="集团Q2招商工作会议纪要",
                content="会议强调要加强品牌引入，提升S级品牌占比，优化业态组合...",
                source="集团总部",
                category=NewsCategory.GROUP,
                is_published=True,
                published_at=datetime.now() - timedelta(days=1),
            ),
            # Industry news - draft
            MarketNews(
                mall_id=mall.id,
                title="首店经济持续升温",
                content="各地商业综合体纷纷引入区域首店、概念店，打造差异化竞争优势...",
                source="零售周刊",
                category=NewsCategory.INDUSTRY,
                is_published=False,
                published_at=None,
            ),
            # Policy news - published
            MarketNews(
                mall_id=mall.id,
                title="上海市商业空间布局规划（2024-2035）",
                content="规划明确了未来十年上海商业空间的发展方向，重点打造15个市级商业中心...",
                source="上海市商务委员会",
                category=NewsCategory.POLICY,
                is_published=True,
                published_at=datetime.now() - timedelta(days=14),
            ),
            # Industry news - published
            MarketNews(
                mall_id=mall.id,
                title="网红餐饮品牌扩张放缓",
                content="受市场环境变化影响，部分网红餐饮品牌调整扩张策略，更加注重单店盈利能力...",
                source="餐饮老板内参",
                category=NewsCategory.INDUSTRY,
                is_published=True,
                published_at=datetime.now() - timedelta(days=10),
            ),
            # Group news - draft
            MarketNews(
                mall_id=mall.id,
                title="2024年度品牌库更新通知",
                content="品牌库已完成年度更新，新增120个品牌，移除35个品牌...",
                source="招商管理部",
                category=NewsCategory.GROUP,
                is_published=False,
                published_at=None,
            ),
            # Industry news - published
            MarketNews(
                mall_id=mall.id,
                title="奢侈品消费回暖信号明显",
                content="随着消费环境改善，奢侈品消费呈现回暖态势，一线城市表现尤为明显...",
                source="时尚商业",
                category=NewsCategory.INDUSTRY,
                is_published=True,
                published_at=datetime.now() - timedelta(days=5),
            ),
        ]

        for news in market_news:
            db.add(news)

        print(f"  Created {len(market_news)} market news records")

        # ========== e) Create MockBusinessData records ==========
        print("\n5. Creating MockBusinessData records...")

        # Get occupied units with active contracts
        occupied_units_result = await db.execute(
            select(Unit).where(Unit.status == UnitStatus.OCCUPIED)
        )
        occupied_units = occupied_units_result.scalars().all()

        if not occupied_units:
            print("  No occupied units found. Skipping.")
        else:
            # Generate data for the last 3 months
            mock_data_count = 0
            current_month = today.replace(day=1)

            for unit in occupied_units:
                # Get contract for this unit to determine tenant
                contract_result = await db.execute(
                    select(Contract).where(
                        Contract.unit_id == unit.id,
                        Contract.status == ContractStatus.ACTIVE
                    )
                )
                contract = contract_result.scalar_one_or_none()

                tenant_id_ref = contract.tenant_id_ref if contract else None

                # Generate data for current month and 2 previous months
                for month_offset in range(3):
                    data_date = current_month - timedelta(days=month_offset * 30)

                    # Generate realistic values
                    area = unit.gross_area or 100
                    daily_traffic = random.randint(100, 2000)
                    daily_sales = random.uniform(500, 50000)
                    monthly_sales = daily_sales * random.randint(25, 30)
                    sales_per_sqm = monthly_sales / area if area > 0 else 0
                    rent_to_sales_ratio = random.uniform(10, 30)

                    mock_data = MockBusinessData(
                        mall_id=mall.id,
                        unit_id=unit.id,
                        tenant_id_ref=tenant_id_ref,
                        data_date=data_date,
                        daily_traffic=daily_traffic,
                        daily_sales=daily_sales,
                        monthly_sales=monthly_sales,
                        sales_per_sqm=sales_per_sqm,
                        rent_to_sales_ratio=rent_to_sales_ratio,
                    )
                    db.add(mock_data)
                    mock_data_count += 1

            print(f"  Created {mock_data_count} mock business data records")

        # Commit all changes
        await db.commit()

        # Print summary
        print("\n" + "=" * 60)
        print("Dashboard seed data created successfully!")
        print("=" * 60)

        # Verify data
        print("\nVerifying seeded data...")

        # Check brand_tier distribution
        brand_tier_result = await db.execute(
            select(Tenant.brand_tier)
        )
        brand_tiers = [t[0] for t in brand_tier_result.fetchall() if t[0]]
        print(f"\nTenant brand_tier distribution:")
        for tier in BrandTier:
            count = sum(1 for t in brand_tiers if t == tier)
            print(f"  {tier.value}: {count}")

        # Check leasing plans status
        plan_status_result = await db.execute(
            select(LeasingPlan.status)
        )
        plan_statuses = [s[0] for s in plan_status_result.fetchall()]
        print(f"\nLeasingPlan status distribution:")
        for status in PlanStatus:
            count = sum(1 for s in plan_statuses if s == status)
            print(f"  {status.value}: {count}")

        # Check market news
        news_count_result = await db.execute(
            select(MarketNews.id)
        )
        news_count = len(news_count_result.fetchall())
        print(f"\nMarketNews records: {news_count}")

        # Check mock business data
        mock_count_result = await db.execute(
            select(MockBusinessData.id)
        )
        mock_count = len(mock_count_result.fetchall())
        print(f"MockBusinessData records: {mock_count}")

        print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
