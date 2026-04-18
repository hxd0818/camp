"""Seed dashboard data for CAMP Kanban Dashboard.

Populates:
- Tenant brand_tier, is_flagship, is_first_entry
- Unit vacancy_days, leasing_type
- LeasingPlan records (5 plans with varied statuses)
- MarketNews records (8 items mixing categories)
- MockBusinessData for occupied units (daily data for last 3 months)

Usage (inside container):
    python scripts/seed_dashboard_data.py
"""

import asyncio
import calendar
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

        mall_id = mall.id
        print(f"Using mall: {mall.name} (id={mall_id})")

        # ========== a) Update Tenant brand_tier ==========
        print("\n[1/5] Updating Tenant brand_tier...")
        tenants_result = await db.execute(select(Tenant))
        tenants = tenants_result.scalars().all()

        if not tenants:
            print("  No tenants found. Skipping.")
        else:
            for tenant in tenants:
                tenant.brand_tier = random_brand_tier()

                # Set is_flagship for some S-tier tenants
                if tenant.brand_tier == BrandTier.S:
                    tenant.is_flagship = random.random() < 0.7
                else:
                    tenant.is_flagship = False

                # Set is_first_entry for some A-tier tenants
                if tenant.brand_tier == BrandTier.A:
                    tenant.is_first_entry = random.random() < 0.6
                else:
                    tenant.is_first_entry = False

            await db.flush()
            print(f"  Updated {len(tenants)} tenants with brand_tier")

        # ========== b) Update Unit vacancy_days and leasing_type ==========
        print("\n[2/5] Updating Unit vacancy_days and leasing_type...")
        units_result = await db.execute(select(Unit))
        units = units_result.scalars().all()

        leasing_types = ["new", "renewal", "adjustment"]

        if not units:
            print("  No units found. Skipping.")
        else:
            vacant_count = 0
            for unit in units:
                if unit.status == UnitStatus.VACANT:
                    unit.vacancy_days = random.randint(15, 200)
                    unit.leasing_type = random.choice(leasing_types)
                    vacant_count += 1
                elif unit.status == UnitStatus.OCCUPIED:
                    unit.vacancy_days = 0
                    # Some occupied units also have a leasing_type hint
                    if random.random() < 0.4:
                        unit.leasing_type = random.choice(leasing_types)
                elif unit.status == UnitStatus.RESERVED:
                    unit.vacancy_days = None
                    unit.leasing_type = "new"
                else:
                    unit.vacancy_days = None
                    unit.leasing_type = None

            await db.flush()
            print(
                f"  Updated {len(units)} units "
                f"({vacant_count} vacant with vacancy_days)"
            )

        # ========== c) Create LeasingPlan records ==========
        print("\n[3/5] Creating LeasingPlan records...")
        today = date.today()
        current_year = today.year

        leasing_plans = [
            # DRAFT plan - Q2招商调整
            LeasingPlan(
                mall_id=mall_id,
                name="Q2品牌调整计划",
                plan_type=PlanType.ADJUSTMENT,
                description=(
                    "针对Q2空置铺位进行品牌升级调整，重点引入餐饮和体验业态。"
                    "目标区域为二楼东侧和三楼北侧空置区。"
                ),
                target_area=850.0,
                target_units=5,
                completed_area=0.0,
                completed_units=0,
                status=PlanStatus.DRAFT,
                owner="招商经理-张三",
                start_date=today + timedelta(days=7),
                due_date=today + timedelta(days=90),
                notes="需审批后启动，已储备意向品牌3家",
            ),
            # ACTIVE plan - S级品牌引入
            LeasingPlan(
                mall_id=mall_id,
                name="S级品牌引入计划",
                plan_type=PlanType.SPECIAL,
                description=(
                    "引入3个S级国际品牌，提升商场整体定位和租金水平。"
                    "优先考虑轻奢、设计师品牌及高端餐饮。"
                ),
                target_area=500.0,
                target_units=3,
                completed_area=120.0,
                completed_units=1,
                status=PlanStatus.ACTIVE,
                owner="招商总监-李四",
                start_date=today - timedelta(days=30),
                due_date=today + timedelta(days=60),
                notes="已签约1家（某轻奢品牌），正在洽谈2家",
            ),
            # IN_PROGRESS plan - 空铺去化专项
            LeasingPlan(
                mall_id=mall_id,
                name="空铺去化专项行动",
                plan_type=PlanType.SPECIAL,
                description=(
                    "针对现有空置铺位进行专项招商攻坚，目标在Q3前将空置率降至8%以下。"
                    "采用一铺一策策略，针对不同位置制定差异化招商方案。"
                ),
                target_area=450.0,
                target_units=8,
                completed_area=180.0,
                completed_units=3,
                status=PlanStatus.IN_PROGRESS,
                owner="招商经理-王五",
                start_date=today - timedelta(days=15),
                due_date=today + timedelta(days=45),
                notes="已签约3家，剩余5家正在洽谈，其中2家进入合同审核阶段",
            ),
            # COMPLETED plan - Q1招商计划
            LeasingPlan(
                mall_id=mall_id,
                name=f"Q1招商调整计划",
                plan_type=PlanType.ADJUSTMENT,
                description=(
                    f"{current_year}年第一季度招商调整工作，"
                    "完成一楼2个铺位的品牌替换和二楼业态优化。"
                ),
                target_area=600.0,
                target_units=6,
                completed_area=600.0,
                completed_units=6,
                status=PlanStatus.COMPLETED,
                owner="招商经理-张三",
                start_date=today - timedelta(days=120),
                due_date=today - timedelta(days=30),
                notes="全部完成，新入驻品牌运营状况良好",
            ),
            # OVERDUE plan - 临期品牌调整
            LeasingPlan(
                mall_id=mall_id,
                name="临期品牌续约推进计划",
                plan_type=PlanType.ADJUSTMENT,
                description=(
                    "针对{year下半年至{year+1年上半年到期的合同进行提前续约谈判，"
                    "避免集中到期造成空置风险。涉及主力店和次主力店共4家。"
                ).format(year=current_year),
                target_area=1200.0,
                target_units=4,
                completed_area=350.0,
                completed_units=1,
                status=PlanStatus.OVERDUE,
                owner="招商经理-赵六",
                start_date=today - timedelta(days=60),
                due_date=today - timedelta(days=7),
                notes="已超期，Apple Store续约已完成，其余3家需加快进度",
            ),
        ]

        for plan in leasing_plans:
            db.add(plan)

        await db.flush()
        print(f"  Created {len(leasing_plans)} leasing plans")
        for p in leasing_plans:
            print(f"    - [{p.status.value}] {p.name}")

        # ========== d) Create MarketNews records ==========
        print("\n[4/5] Creating MarketNews records...")

        market_news = [
            # Industry news - published (recent)
            MarketNews(
                mall_id=mall_id,
                title=f"{current_year}年第一季度全国购物中心客流报告发布",
                content=(
                    f"据中国购物中心产业研究院发布的最新数据显示，{current_year}年Q1全国主要城市"
                    "购物中心日均客流量同比增长8.3%，其中一线城市核心商圈恢复至2019年同期95%水平。"
                    "体验业态占比持续提升，餐饮、影院、亲子娱乐成为拉动客流的主力。"
                    "报告指出，具有差异化定位的项目表现优于同质化竞争项目。"
                ),
                source="中国购物中心产业研究院",
                category=NewsCategory.INDUSTRY,
                is_published=True,
                published_at=datetime.now() - timedelta(days=3),
            ),
            # Policy news - published
            MarketNews(
                mall_id=mall_id,
                title="商务部出台新一轮促消费政策 支持实体商业发展",
                content=(
                    "商务部近日发布《关于进一步促进消费扩容提质加快形成强大国内市场的实施意见》，"
                    "明确提出支持实体商业转型升级，鼓励发展首店经济、夜间经济等新消费场景。"
                    "政策涵盖减税降费、租金补贴、数字化改造等多个方面，预计将为商业地产带来新的发展机遇。"
                ),
                source="商务部官网",
                category=NewsCategory.POLICY,
                is_published=True,
                published_at=datetime.now() - timedelta(days=7),
            ),
            # Group news - published (very recent)
            MarketNews(
                mall_id=mall_id,
                title=f"集团召开{current_year}年度招商工作会议",
                content=(
                    f"集团于4月15日在总部召开{current_year}年度招商工作会议，各项目公司汇报了"
                    "当前招商进展和下半年工作计划。会议强调要聚焦品牌升级和业态优化，"
                    "提升项目整体租金收益和市场竞争力。Sunshine Plaza被评为集团标杆项目。"
                ),
                source="集团办公室",
                category=NewsCategory.GROUP,
                is_published=True,
                published_at=datetime.now() - timedelta(days=2),
            ),
            # Industry news - draft
            MarketNews(
                mall_id=mall_id,
                title="快时尚品牌加速布局下沉市场",
                content=(
                    "H&M、Zara、优衣库等国际快时尚品牌近年来持续加大二三线城市布局力度。"
                    "数据显示，快时尚品牌在三四线城市的门店数量年增长率超过15%，"
                    "平均单店面积较一线城市的旗舰店小30%-40%，但坪效表现亮眼。"
                ),
                source="联商网",
                category=NewsCategory.INDUSTRY,
                is_published=False,
                published_at=None,
            ),
            # Policy news - published
            MarketNews(
                mall_id=mall_id,
                title=f"上海市发布商业网点布局规划（{current_year}-2030）",
                content=(
                    f"上海市商务委正式发布新一轮商业网点布局规划，明确到2030年全市将形成"
                    "'一核两带多节点'的商业空间格局。规划对社区商业、区域商圈、城市副中心"
                    "等不同层级商业设施提出了具体的发展指引和规模控制要求。"
                ),
                source="上海市商务委员会",
                category=NewsCategory.POLICY,
                is_published=True,
                published_at=datetime.now() - timedelta(days=14),
            ),
            # Industry news - published
            MarketNews(
                mall_id=mall_id,
                title="新能源车企展厅入驻购物中心成新趋势",
                content=(
                    "特斯拉、蔚来、理想、问界等新能源汽车品牌纷纷在主流购物中心开设体验店或展厅。"
                    "这类店铺通常选址于一楼黄金位置，面积在200-500平米之间，"
                    "兼具品牌展示和销售功能，已成为购物中心招商的新热点。"
                    "据统计，TOP50购物中心中有38家已引入至少1个新能源车品牌。"
                ),
                source="赢商网",
                category=NewsCategory.INDUSTRY,
                is_published=True,
                published_at=datetime.now() - timedelta(days=10),
            ),
            # Group news - draft
            MarketNews(
                mall_id=mall_id,
                title=f"集团Q1经营分析会纪要",
                content=(
                    "集团Q1经营分析会于3月底召开，各项目汇报了一季度运营情况。"
                    "整体出租率保持稳定，平均租金单价同比微增2.1%。"
                    "部分项目存在空置率偏高的问题，需加强招商去化力度。"
                    "Sunshine Plaza出租率92%，高于集团平均水平。"
                ),
                source="集团运营管理部",
                category=NewsCategory.GROUP,
                is_published=False,
                published_at=None,
            ),
            # Industry news - published (older)
            MarketNews(
                mall_id=mall_id,
                title="咖啡赛道持续内卷 独立咖啡馆数量突破10万家",
                content=(
                    "据美团数据显示，截至" + str(current_year) + "年初中国独立咖啡馆数量已突破10万家，"
                    "同比增长22%。瑞幸、库迪等连锁品牌持续价格竞争，"
                    "行业集中度进一步提升，中小品牌面临较大生存压力。"
                    "购物中心餐饮业态中咖啡品类占比已达18%。"
                ),
                source="36氪",
                category=NewsCategory.INDUSTRY,
                is_published=True,
                published_at=datetime.now() - timedelta(days=25),
            ),
        ]

        for news_item in market_news:
            db.add(news_item)

        await db.flush()
        published_count = sum(1 for n in market_news if n.is_published)
        print(f"  Created {len(market_news)} market news ({published_count} published)")

        # ========== e) Create MockBusinessData records ==========
        print("\n[5/5] Creating MockBusinessData records...")

        # Get occupied units with active contracts
        occupied_units_result = await db.execute(
            select(Unit).where(Unit.status == UnitStatus.OCCUPIED)
        )
        occupied_units = occupied_units_result.scalars().all()

        if not occupied_units:
            print("  No occupied units found. Skipping.")
        else:
            mock_data_count = 0

            # Generate daily data for last 90 days (3 months)
            for days_ago in range(89, -1, -1):
                data_date = today - timedelta(days=days_ago)

                for unit in occupied_units:
                    # Get contract for this unit to determine tenant reference
                    contract_result = await db.execute(
                        select(Contract).where(
                            Contract.unit_id == unit.id,
                            Contract.status == ContractStatus.ACTIVE,
                        )
                    )
                    contract = contract_result.scalar_one_or_none()
                    tenant_id_ref = contract.tenant_id_ref if contract else None

                    area = unit.gross_area or 100.0

                    # Base traffic/sales scale with unit area and add randomness
                    base_traffic = int(area * random.uniform(1.5, 4.0))
                    daily_traffic = max(100, min(2000, base_traffic + random.randint(-200, 300)))

                    # Weekend boost
                    if data_date.weekday() >= 5:  # Saturday or Sunday
                        daily_traffic = int(daily_traffic * random.uniform(1.3, 1.7))

                    daily_sales = round(
                        max(500, min(50000, daily_traffic * random.uniform(30, 150))), 2
                    )

                    # Monthly sales: approximate based on day of month
                    _, days_in_month = calendar.monthrange(data_date.year, data_date.month)
                    monthly_sales = round(
                        daily_sales * days_in_month * random.uniform(0.85, 1.1), 2
                    )

                    sales_per_sqm = round(monthly_sales / area, 2) if area > 0 else 0.0

                    # Rent-to-sales ratio: realistic range 8%-40%
                    estimated_monthly_rent = area * 8.5 * 30  # rough estimate
                    rent_to_sales_ratio = round(
                        max(8.0, min(40.0, estimated_monthly_rent / monthly_sales * 100)),
                        2,
                    ) if monthly_sales > 0 else 20.0

                    mock_record = MockBusinessData(
                        mall_id=mall_id,
                        unit_id=unit.id,
                        tenant_id_ref=tenant_id_ref,
                        data_date=data_date,
                        daily_traffic=daily_traffic,
                        daily_sales=daily_sales,
                        monthly_sales=monthly_sales,
                        sales_per_sqm=sales_per_sqm,
                        rent_to_sales_ratio=rent_to_sales_ratio,
                    )
                    db.add(mock_record)
                    mock_data_count += 1

            await db.flush()
            print(
                f"  Created {mock_data_count} mock business data records "
                f"({len(occupied_units)} occupied units x 90 days)"
            )

        # Commit all changes
        await db.commit()

        # Print summary
        print("\n" + "=" * 60)
        print("Dashboard seed data created successfully!")
        print("=" * 60)

        # Verify data
        print("\nVerifying seeded data...")

        # Check brand_tier distribution
        brand_tier_result = await db.execute(select(Tenant.brand_tier))
        brand_tiers = [t[0] for t in brand_tier_result.fetchall() if t[0]]
        print(f"\nTenant brand_tier distribution:")
        for tier in BrandTier:
            count = sum(1 for t in brand_tiers if t == tier)
            print(f"  {tier.value}: {count}")

        # Check leasing plans status
        plan_status_result = await db.execute(select(LeasingPlan.status))
        plan_statuses = [s[0] for s in plan_status_result.fetchall()]
        print(f"\nLeasingPlan status distribution:")
        for status in PlanStatus:
            count = sum(1 for s in plan_statuses if s == status)
            print(f"  {status.value}: {count}")

        # Check market news
        news_count_result = await db.execute(select(MarketNews.id))
        news_count = len(news_count_result.fetchall())
        print(f"\nMarketNews total: {news_count}")

        # Check mock business data
        mock_count_result = await db.execute(select(MockBusinessData.id))
        mock_count = len(mock_count_result.fetchall())
        print(f"MockBusinessData total: {mock_count}")

        print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
