"""Generate floor plan images with unit hotspots for CAMP demo.

Creates PNG images with colored rectangles representing each store unit,
then creates FloorPlan records in the database.

Usage (inside container):
    python scripts/gen_floorplans.py
"""

import asyncio
import sys
from pathlib import Path
from io import BytesIO

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from PIL import Image, ImageDraw, ImageFont
from app.database import AsyncSessionLocal, engine
from sqlalchemy import select, text
from app.models import Base, Unit
from sqlalchemy import func


# Floor plan dimensions (pixels)
IMG_WIDTH = 1200
IMG_HEIGHT = 800

# Color scheme for unit statuses
STATUS_COLORS = {
    'occupied': '#22c55e',   # green
    'vacant': '#ef4444',     # red
    'reserved': '#a855f7',   # purple
    'maintenance': '#6b7280',  # gray
}

BG_COLOR = '#f8fafc'
LINE_COLOR = '#cbd5e1'
TEXT_COLOR = '#374151'


def generate_floor_image(units_data: list[dict], floor_number: int) -> bytes:
    """Generate a floor plan PNG image with unit rectangles."""
    img = Image.new('RGB', (IMG_WIDTH, IMG_HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Try to use a default font, fall back to default if not available
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
    except Exception:
        font = ImageFont.load_default()

    # Title bar
    draw.rectangle([0, 0, IMG_WIDTH, 40], fill='#e2e8f0')
    title = f'Sunshine Plaza - {floor_number}F'
    bbox = draw.textbbox((10, 8), title, font=font)
    draw.line([(0, 38), (bbox[2] + 5, 38)], fill=LINE_COLOR)

    # Draw each unit as a colored rectangle
    for u in units_data:
        hd = u.get('hotspot_data', {})
        if not hd:
            continue

        x = hd.get('x', 50)
        y = hd.get('y', 50)
        w = hd.get('width', 150)
        h = hd.get('height', 100)
        shape = hd.get('shape', 'rect')

        color = STATUS_COLORS.get(u.get('status', 'vacant'), '#94a3b8')

        if shape == 'rect':
            draw.rectangle([x, y, x + w, y + h], outline='#ffffff', width=2, fill=color)
        else:
            points = hd.get('points', [])
            if points:
                polygon_coords = [(p[0], p[1]) for p in points]
                draw.polygon(polygon_coords, outline='#ffffff', width=2, fill=color)

        # Unit code label
        code = u.get('code', '')
        name = u.get('name', '')
        label = name if name != code else code
        text_bbox = draw.textbbox((x + 4, y + 4), label, font=font)

    # Save to bytes
    buf = BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


async def main():
    """Generate floor plans for floors that have units with hotspot data."""
    async with AsyncSessionLocal() as db:
        # Get distinct floor_ids that have units with hotspot data
        result = await db.execute(
            select(Unit.floor_id, func.count().label('unit_count'))
            .where(Unit.hotspot_data.isnot(None))
            .group_by(Unit.floor_id)
        )
        rows = result.all()

        if not rows:
            print("No units with hotspot data found. Run seed_data.py first.")
            return

        from app.config import get_settings
        settings = get_settings()
        upload_dir = Path(settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)

        for row in rows:
            floor_id = row[0]
            unit_count = row[1]

            # Get all units for this floor with hotspot data
            units_result = await db.execute(
                select(Unit).where(
                    Unit.floor_id == floor_id,
                    Unit.hotspot_data.isnot(None)
                ).order_by(Unit.code)
            )
            units = units_result.scalars().all()

            if not units:
                print(f"Floor {floor_id}: no units with hotspot data")
                continue

            # Build unit data list for image generation
            units_data = []
            for u in units:
                hd = u.hotspot_data or {}
                units_data.append({
                    'code': u.code,
                    'name': u.name,
                    'status': u.status.value,
                    'hotspot_data': hd,
                })

            # Generate image
            print(f"Generating floor plan for F{floor_id} ({unit_count} units)...")
            image_bytes = generate_floor_image(units_data, floor_id)

            # Save image to uploads directory
            filename = f'floor_{floor_id}_plan.png'
            filepath = upload_dir / filename
            with open(filepath, 'wb') as f:
                f.write(image_bytes)
            image_url = f'/uploads/{filename}'

            print(f"  Saved: {filepath}")

            # Deactivate existing plans for this floor
            await db.execute(
                text('UPDATE floor_plans SET is_active = false WHERE floor_id = :fid'),
                {'fid': floor_id}
            )

            # Build hotspots array
            hotspots = []
            for u in units:
                hd = u.hotspot_data or {}
                hotspots.append({
                    'unit_id': u.id,
                    'unit_code': u.code,
                    'x': hd.get('x', 0),
                    'y': hd.get('y', 0),
                    'w': hd.get('width', 100),
                    'h': hd.get('height', 80),
                    'shape': hd.get('shape', 'rect'),
                })

            from app.models.unit import FloorPlan
            fp = FloorPlan(
                floor_id=floor_id,
                image_url=image_url,
                image_width=IMG_WIDTH,
                image_height=IMG_HEIGHT,
                hotspots=hotspots,
                version=1,
                is_active=True,
            )
            db.add(fp)

            await db.commit()
            print(f"  Created FloorPlan record: {fp.id}")

    print("\nDone! Floor plans generated successfully.")


if __name__ == '__main__':
    asyncio.run(main())
