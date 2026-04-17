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
from app.models.mall import Mall, Building, Floor, MallStatus
from app.models.unit import Unit, UnitStatus, UnitLayoutType, FloorPlan
from app.models.tenant import Tenant, TenantType, TenantStatus
from app.models.contract import (
    Contract, ContractStatus, PaymentFrequency,
    Invoice, Payment,
)
from datetime import date, timedelta


async def seed():
    """Create demo data: one mall with sample tenants and contracts."""
    from app.models import Base

    # Drop and recreate tables for clean seed
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Create Mall
        mall = Mall(
            name="Sunshine Plaza",
            code="SUNSHINE-001",
            address="123 Central Avenue, Pudong District",
            city="Shanghai",
            total_area=45000.0,
            status=MallStatus.ACTIVE,
            description="Premium shopping mall in Shanghai CBD",
        )
        db.add(mall)
        await db.flush()

        # 2. Create Building
        building = Building(
            mall_id=mall.id,
            name="Main Building",
            code="A",
            total_floors=5,
            description="Primary retail building with 5 floors",
        )
        db.add(building)
        await db.flush()

        # 3. Create Floors (5 floors)
        floors = []
        for floor_num in range(1, 6):
            floor = Floor(
                building_id=building.id,
                floor_number=floor_num,
                name=f"F{floor_num}",
                total_area=9000.0 if floor_num != 1 else 8000.0,
                sort_order=floor_num,
                description=f"Level {floor_num}",
            )
            db.add(floor)
            floors.append(floor)
        await db.flush()

        # 4. Create Units (sample stores)
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

        all_units = []
        for idx, (code, name, layout, status_str, area) in enumerate(unit_configs):
            if idx < 6:
                floor_id = floors[0].id
                x_base = 50 + (idx % 3) * 220
                y_base = 30 + (idx // 3) * 160
            elif idx < 11:
                floor_id = floors[1].id
                local_idx = idx - 6
                x_base = 50 + (local_idx % 3) * 220
                y_base = 30 + (local_idx // 3) * 160
            else:
                floor_id = floors[2].id
                local_idx = idx - 11
                x_base = 80 + (local_idx % 2) * 280
                y_base = 40 + (local_idx // 2) * 180

            unit = Unit(
                floor_id=floor_id,
                code=code,
                name=name,
                layout_type=UnitLayoutType(layout),
                status=UnitStatus(status_str),
                gross_area=float(area),
                net_leasable_area=float(area) * 0.85,
                hotspot_data={
                    "x": x_base,
                    "y": y_base,
                    "width": 200,
                    "height": 140,
                    "shape": "rect",
                },
            )
            db.add(unit)
            all_units.append(unit)
        await db.flush()

        # 5. Create Tenants
        tenant_data = [
            ("Zara China Retail Co., Ltd.", "company", "Zhang Wei", "138****1234"),
            ("H&M China Trading Co.", "company", "Li Ming", "139****5678"),
            ("Fast Retailing (Uniqlo)", "company", "Wang Fang", "137****9012"),
            ("Starbucks Coffee Shanghai", "company", "Chen Jie", "136****3456"),
            ("Nike Sports (China)", "company", "Liu Yang", "135****7890"),
            ("Adidas China China Ltd.", "company", "Zhao Qiang", "134****2345"),
            ("Sephora (China) Co., Ltd.", "company", "Sun Lei", "133****6789"),
            ("Miniso (China) Co., Ltd.", "company", "Zhou Ting", "132****0123"),
            ("Apple Retail China", "company", "Wu Hao", "131****4567"),
            ("Samsung Electronics China", "company", "Zheng Kai", "130****8901"),
        ]

        tenants = []
        for name, ttype, contact, phone in tenant_data:
            t = Tenant(
                name=name,
                type=TenantType(ttype),
                contact_person=contact,
                phone=phone,
                status=TenantStatus.ACTIVE,
            )
            db.add(t)
            tenants.append(t)
        await db.flush()

        # 6. Create Contracts for occupied units
        occupied_units = [u for u in all_units if u.status == UnitStatus.OCCUPIED]

        for i, unit in enumerate(occupied_units[:len(tenants)]):
            lease_start = date(2024, 1, 1) + timedelta(days=i * 30)
            lease_end = lease_start + timedelta(days=365 * 3)

            contract = Contract(
                tenant_id_ref=tenants[i].id,
                unit_id=unit.id,
                contract_number=f"CT-{mall.code}-{unit.code}-{lease_start.year}",
                status=ContractStatus.ACTIVE,
                lease_start=lease_start,
                lease_end=lease_end,
                monthly_rent=round(float(unit.gross_area or 100) * 8.5 * 30, 2),
                deposit=round(float(unit.gross_area or 100) * 8.5 * 90, 2),
                currency="CNY",
                payment_frequency=PaymentFrequency.MONTHLY,
                signed_area=unit.gross_area,
                unit_code_at_signing=unit.code,
            )
            db.add(contract)
        await db.flush()

        # 7. Create some sample invoices
        active_contracts_result = await db.execute(
            __import__("sqlalchemy", fromlist=["select"]).select(Contract).where(
                Contract.status == ContractStatus.ACTIVE
            ).limit(5)
        )
        active_contracts = active_contracts_result.scalars().all()

        # Create invoices and collect them
        invoices_created = []
        for i, contract in enumerate(active_contracts):
            invoice_date = date.today() - timedelta(days=i * 15)
            invoice = Invoice(
                contract_id=contract.id,
                invoice_number=f"INV-{date.today().strftime('%Y%m')}-{i+1:04d}",
                amount=contract.monthly_rent or 50000,
                due_date=invoice_date + timedelta(days=30),
                status="paid" if i < 3 else "pending",
                issued_date=invoice_date,
            )
            db.add(invoice)
            invoices_created.append(invoice)

        # Flush invoices to get IDs before creating payments
        await db.flush()

        # Create payments for first 3 invoices (marked as paid)
        for i, invoice in enumerate(invoices_created):
            if i >= 3:
                break
            payment = Payment(
                invoice_id=invoice.id,
                amount=invoice.amount,
                payment_date=date.today() - timedelta(days=(i * 15) + 5),
                payment_method="bank_transfer",
                reference_number=f"PAY-{date.today().strftime('%Y%m')}-{i+1:04d}",
            )
            db.add(payment)

        await db.commit()

        # Print summary
        print("\n" + "=" * 50)
        print("Seed data created successfully!")
        print("=" * 50)
        print(f"Mall:     {mall.name} ({mall.code})")
        print(f"Building: {building.name} ({building.code})")
        print(f"Floors:   {len(floors)}")
        print(f"Units:    {len(all_units)}")
        print(f"  - Occupied: {sum(1 for u in all_units if u.status == UnitStatus.OCCUPIED)}")
        print(f"  - Vacant:   {sum(1 for u in all_units if u.status == UnitStatus.VACANT)}")
        print(f"  - Reserved: {sum(1 for u in all_units if u.status == UnitStatus.RESERVED)}")
        print(f"Tenants:  {len(tenants)}")
        print(f"\nLogin:   admin / admin123")
        print(f"API:     http://localhost:8201/docs")
        print(f"Frontend: http://localhost:3201")
        print("=" * 50)


if __name__ == "__main__":
    asyncio.run(seed())
