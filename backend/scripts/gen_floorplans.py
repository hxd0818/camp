"""Generate professional-looking floor plan images for CAMP demo.

Creates PNG images that resemble real commercial building floor plans:
- Ring-layout corridor with stores along perimeter
- Central atrium with escalators/elevators
- Restrooms, fire exits, service areas
- Unit labels showing store name + code + area
- Architectural drawing style (clean lines, subtle colors)

Usage (inside container):
    python scripts/gen_floorplans.py
"""

import asyncio
import sys
from pathlib import Path
from io import BytesIO

sys.path.insert(0, str(Path(__file__).parent.parent))

from PIL import Image, ImageDraw, ImageFont
from app.database import AsyncSessionLocal
from sqlalchemy import select, text
from app.models.unit import Unit
from sqlalchemy import func


# ── Canvas dimensions ──────────────────────────────────────────────
IMG_WIDTH = 1200
IMG_HEIGHT = 820

# ── Color palette (professional architectural style) ──────────────
BG_WHITE = '#ffffff'
WALL_COLOR = '#1e293b'          # dark slate for walls
WALL_THICK = 3
CORRIDOR_FILL = '#f1f5f9'       # very light gray for corridor
ATRIUM_FILL = '#f8fafc'         # near-white for atrium
UNIT_FILL_OCCUPIED = '#dcfce7' # very light green
UNIT_FILL_VACANT = '#fee2e2'    # very light red
UNIT_FILL_RESERVED = '#f3e8ff'  # very light purple
UNIT_FILL_MAINTENANCE = '#f1f5f9'  # light gray
UNIT_BORDER = '#334155'        # dark border for units
CORRIDOR_BORDER = '#94a3b8'     # medium gray for corridor edges
TEXT_DARK = '#1e293b'          # primary text
TEXT_MUTED = '#64748b'         # secondary text (area, code)
ACCENT_CAMP = '#2563eb'        # blue accent for title/legend
FACILITY_FILL = '#e2e8f0'      # light gray for facilities (restroom, etc.)
FACILITY_BORDER = '#94a3b8'

# Status color mapping
STATUS_FILLS = {
    'occupied': UNIT_FILL_OCCUPIED,
    'vacant': UNIT_FILL_VACANT,
    'reserved': UNIT_FILL_RESERVED,
    'maintenance': UNIT_FILL_MAINTENANCE,
}


def _load_fonts():
    """Load fonts, falling back gracefully."""
    font_paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    ]
    try:
        font_regular = ImageFont.truetype(font_paths[0], 11)
        font_bold = ImageFont.truetype(font_paths[1], 13)
        font_small = ImageFont.truetype(font_paths[0], 9)
        font_title = ImageFont.truetype(font_paths[1], 16)
    except Exception:
        default = ImageFont.load_default()
        font_regular = default
        font_bold = default
        font_small = default
        font_title = default
    return font_regular, font_bold, font_small, font_title


def _draw_rounded_rect(draw, coords, radius=4, **kwargs):
    """Draw a rounded rectangle."""
    x1, y1, x2, y2 = coords
    draw.rectangle(coords, **kwargs)


def _compute_text_size(draw, text, font):
    """Get text bounding box size."""
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _draw_text_centered(draw, cx, cy, text, font, fill=TEXT_DARK):
    """Draw text centered at (cx, cy)."""
    w, h = _compute_text_size(draw, text, font)
    draw.text((cx - w / 2, cy - h / 2), text, fill=fill, font=font)


def generate_floor_image(units_data: list[dict], floor_number: int) -> bytes:
    """Generate a professional-looking floor plan PNG image."""

    img = Image.new('RGB', (IMG_WIDTH, IMG_HEIGHT), BG_WHITE)
    draw = ImageDraw.Draw(img)
    f_reg, f_bold, f_sml, f_ttl = _load_fonts()

    # ═══ Layout constants ═══
    margin_l = 20
    margin_r = 20
    margin_t = 52      # space for title bar
    margin_b = 36      # space for legend/scale
    plan_x = margin_l
    plan_y = margin_t
    plan_w = IMG_WIDTH - margin_l - margin_r
    plan_h = IMG_HEIGHT - margin_t - margin_b

    # Corridor width (inner ring)
    corr_w = 72

    # ── Title bar ──
    draw.rectangle([0, 0, IMG_WIDTH, margin_t], fill='#f8fafc')
    draw.line([(0, margin_t - 1), (IMG_WIDTH, margin_t - 1)], fill='#e2e8f0')
    floor_names = {1: 'L1 / 1F', 2: 'L2 / 2F', 3: 'L3 / 3F', 4: 'L4 / 4F', 5: 'L5 / 5F'}
    title = f'Sunshine Plaza  {floor_names.get(floor_number, str(floor_number) + "F")}'
    draw.text((16, 16), title, fill=TEXT_DARK, font=f_ttl)

    # Subtitle right-aligned
    sub = f'Total Units: {len(units_data)}'
    sw, sh = _compute_text_size(draw, sub, f_reg)
    draw.text((IMG_WIDTH - sw - 16, 18), sub, fill=TEXT_MUTED, font=f_reg)

    # ── Draw outer building wall ──
    draw.rectangle(
        [plan_x, plan_y, plan_x + plan_w, plan_y + plan_h],
        outline=WALL_COLOR, width=WALL_THICK
    )

    # ── Compute unit positions based on floor layout ──
    unit_rects = _layout_units(units_data, plan_x, plan_y, plan_w, plan_h, corr_w)

    # ── Draw corridor (the inner walkway area) ──
    _draw_corridor(draw, unit_rects, plan_x, plan_y, plan_w, plan_h, corr_w)

    # ── Draw facilities (escalators, elevators, restrooms) ──
    _draw_facilities(draw, plan_x, plan_y, plan_w, plan_h, corr_w, f_reg, f_sml)

    # ── Draw each unit ──
    for ur in unit_rects:
        _draw_unit(draw, ur, f_bold, f_reg, f_sml)

    # ── Legend bar at bottom ──
    _draw_legend(draw, IMG_WIDTH, IMG_HEIGHT, margin_b, f_reg)

    buf = BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


def _layout_units(units_data, px, py, pw, ph, corr_w):
    """Compute unit rectangles in a ring layout around the corridor.

    Returns list of dicts with rect coords + unit data.
    """
    n = len(units_data)
    if n == 0:
        return []

    rects = []
    inner_x = px + corr_w
    inner_y = py + corr_w
    inner_w = pw - 2 * corr_w
    inner_h = ph - 2 * corr_w

    # Determine which sides get units based on count
    # Strategy: distribute units along top, right, bottom, left walls

    # Calculate how many units per side
    top_units = []
    right_units = []
    bottom_units = []
    left_units = []

    if n <= 4:
        # Few units: one per side max, some sides empty
        sides = ['top', 'right', 'bottom', 'left']
        for i, u in enumerate(units_data):
            side = sides[i % 4]
            {'top': top_units, 'right': right_units,
             'bottom': bottom_units, 'left': left_units}[side].append(u)
    elif n <= 8:
        # Medium: 2 per side
        per_side = (n + 3) // 4
        for i, u in enumerate(units_data):
            sidx = min(i // max(per_side, 1), 3)
            side = ['top', 'right', 'bottom', 'left'][sidx]
            {'top': top_units, 'right': right_units,
             'bottom': bottom_units, 'left': left_units}[side].append(u)
    else:
        # Many: distribute proportionally by available width
        half = (n + 1) // 2
        top_units = units_data[:half]
        bottom_units = units_data[half:]

    # Place top units
    if top_units:
        usable_w = inner_w - 10  # small gaps between units
        total_ratio = sum(_unit_width_weight(u) for u in top_units)
        cx = inner_x + 5
        for u in top_units:
            w = int(usable_w * (_unit_width_weight(u) / total_ratio))
            w = max(w, 100)
            h = corr_w - 4
            rects.append({
                'rect': (cx, py + 2, cx + w, py + 2 + h),
                'data': u,
                'side': 'top',
            })
            cx += w + 6

    # Place right units
    if right_units:
        usable_h = inner_h - 10
        total_ratio = sum(_unit_height_weight(u) for u in right_units)
        cy = inner_y + 5
        for u in right_units:
            h = int(usable_h * (_unit_height_weight(u) / total_ratio))
            h = max(h, 80)
            w = corr_w - 4
            rects.append({
                'rect': (px + pw - corr_w + 2, cy, px + pw - 2, cy + h),
                'data': u,
                'side': 'right',
            })
            cy += h + 6

    # Place bottom units
    if bottom_units:
        usable_w = inner_w - 10
        total_ratio = sum(_unit_width_weight(u) for u in bottom_units)
        cx = inner_x + 5
        for u in bottom_units:
            w = int(usable_w * (_unit_width_weight(u) / total_ratio))
            w = max(w, 100)
            h = corr_w - 4
            rects.append({
                'rect': (cx, py + ph - corr_w - 2, cx + w, py + ph - 2),
                'data': u,
                'side': 'bottom',
            })
            cx += w + 6

    # Place left units
    if left_units:
        usable_h = inner_h - 10
        total_ratio = sum(_unit_height_weight(u) for u in left_units)
        cy = inner_y + 5
        for u in left_units:
            h = int(usable_h * (_unit_height_weight(u) / total_ratio))
            h = max(h, 80)
            w = corr_w - 4
            rects.append({
                'rect': (px + 2, cy, px + 2 + w, cy + h),
                'data': u,
                'side': 'left',
            })
            cy += h + 6

    return rects


def _unit_width_weight(u):
    """Width weight based on area (anchor stores wider)."""
    area = u.get('area', 100) or 100
    layout = u.get('layout_type', 'retail')
    if layout == 'anchor':
        return area * 2.5
    elif layout == 'kiosk':
        return area * 0.4
    return area * 1.0


def _unit_height_weight(u):
    """Height weight based on area."""
    area = u.get('area', 100) or 100
    layout = u.get('layout_type', 'retail')
    if layout == 'anchor':
        return area * 2.0
    return area * 1.0


def _draw_corridor(draw, unit_rects, px, py, pw, ph, corr_w):
    """Draw the corridor area (walkway between outer wall and units)."""
    # Fill corridor background
    # Top corridor strip
    draw.rectangle([px, py, px + pw, py + corr_w], fill=CORRIDOR_FILL)
    # Bottom corridor strip
    draw.rectangle([px, py + ph - corr_w, px + pw, py + ph], fill=CORRIDOR_FILL)
    # Left corridor strip
    draw.rectangle([px, py, px + corr_w, py + ph], fill=CORRIDOR_FILL)
    # Right corridor strip
    draw.rectangle([px + pw - corr_w, py, px + pw, py + ph], fill=CORRIDOR_FILL)

    # Inner corners (round off corridor visually)
    corner_sz = corr_w + 4
    # Top-left corner fill
    draw.rectangle([px, py, px + corner_sz, py + corner_sz], fill=CORRIDOR_FILL)
    # Top-right corner fill
    draw.rectangle([px + pw - corner_sz, py, px + pw, py + corner_sz], fill=CORRIDOR_FILL)
    # Bottom-left corner fill
    draw.rectangle([px, py + ph - corner_sz, px + corner_sz, py + ph], fill=CORRIDOR_FILL)
    # Bottom-right corner fill
    draw.rectangle([px + pw - corner_sz, py + ph - corner_sz, px + pw, py + ph], fill=CORRIDOR_FILL)

    # Center atrium area
    ax = px + corr_w + 12
    ay = py + corr_w + 12
    aw = pw - 2 * corr_w - 24
    ah = ph - 2 * corr_w - 24
    draw.rectangle([ax, ay, ax + aw, ay + ah], fill=ATRIUM_FILL, outline=CORRIDOR_BORDER, width=1)

    # Atrium label
    try:
        f_sml = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 9)
    except Exception:
        f_sml = ImageFont.load_default()
    _draw_text_centered(draw, ax + aw / 2, ay + ah / 2, 'ATRIUM', f_sml, fill='#cbd5e1')


def _draw_facilities(draw, px, py, pw, ph, corr_w, f_reg, f_sml):
    """Draw escalators, elevators, restrooms, entrance."""
    mid_x = px + pw // 2
    mid_y = py + ph // 2

    # Escalator box (center of atrium, vertical)
    esc_w = 28
    esc_h = 90
    esc_x = mid_x - esc_w // 2
    esc_y = mid_y - esc_h // 2
    draw.rectangle([esc_x, esc_y, esc_x + esc_w, esc_y + esc_h],
                   fill=FACILITY_FILL, outline=FACILITY_BORDER, width=1)
    # Escalator steps (lines)
    for i in range(6):
        sy = esc_y + 10 + i * 13
        draw.line([(esc_x + 4, sy), (esc_x + esc_w - 4, sy)], fill='#cbd5e1')
    _draw_text_centered(draw, esc_x + esc_w / 2, esc_y + esc_h + 8, 'ESC', f_sml, fill=TEXT_MUTED)

    # Elevator (right of escalator)
    elv_x = esc_x + esc_w + 14
    elv_y = mid_y - 18
    elv_sz = 30
    draw.rectangle([elv_x, elv_y, elv_x + elv_sz, elv_y + elv_sz],
                   fill=FACILITY_FILL, outline=FACILITY_BORDER, width=1)
    draw.line([(elv_x + elv_sz // 2, elv_y + 4), (elv_x + elv_sz // 2, elv_y + elv_sz - 4)],
              fill='#94a3b8', width=1)
    draw.line([(elv_x + 4, elv_y + elv_sz // 2), (elv_x + elv_sz - 4, elv_y + elv_sz // 2)],
              fill='#94a3b8', width=1)
    _draw_text_centered(draw, elv_x + elv_sz / 2, elv_y + elv_sz + 8, 'ELEV', f_sml, fill=TEXT_MUTED)

    # Restroom (left of escalator)
    rr_x = esc_x - 14 - 30
    rr_y = mid_y - 18
    rr_sz = 30
    draw.rectangle([rr_x, rr_y, rr_x + rr_sz, rr_y + rr_sz],
                   fill=FACILITY_FILL, outline=FACILITY_BORDER, width=1)
    _draw_text_centered(draw, rr_x + rr_sz / 2, rr_y + rr_sz / 2 - 4, 'WC', f_sml, fill=TEXT_MUTED)

    # Main entrance (bottom center)
    ent_w = 80
    ent_h = 14
    ent_x = mid_x - ent_w // 2
    ent_y = py + ph - ent_h
    draw.rectangle([ent_x, ent_y, ent_x + ent_w, ent_y + ent_h],
                   fill='#dbeafe', outline=ACCENT_CAMP, width=1)
    _draw_text_centered(draw, mid_x, ent_y + ent_h / 2, 'MAIN ENTRANCE', f_sml, fill=ACCENT_CAMP)

    # Fire exit markers (corners)
    fe_sz = 22
    # Top-left
    draw.rectangle([px + 4, py + 4, px + 4 + fe_sz, py + 4 + fe_sz // 2],
                   fill='#fef2f2', outline='#fca5a5', width=1)
    # Top-right
    draw.rectangle([px + pw - 4 - fe_sz, py + 4, px + pw - 4, py + 4 + fe_sz // 2],
                   fill='#fef2f2', outline='#fca5a5', width=1)


def _draw_unit(draw, ur, f_bold, f_reg, f_sml):
    """Draw a single unit rectangle with label."""
    x1, y1, x2, y2 = ur['rect']
    u = ur['data']
    status = u.get('status', 'vacant')

    # Fill color based on status
    fill = STATUS_FILLS.get(status, UNIT_FILL_VACANT)

    # Unit body
    draw.rectangle([x1, y1, x2, y2], fill=fill, outline=UNIT_BORDER, width=1)

    # Door opening (small gap in the wall facing corridor)
    door_w = min(24, (x2 - x1) // 3)
    door_h = 3
    side = ur['side']
    if side == 'top':
        dx = (x1 + x2) // 2 - door_w // 2
        draw.rectangle([dx, y2 - door_h, dx + door_w, y2 + 2], fill=CORRIDOR_FILL)
    elif side == 'bottom':
        dx = (x1 + x2) // 2 - door_w // 2
        draw.rectangle([dx, y1 - 2, dx + door_w, y1 + door_h], fill=CORRIDOR_FILL)
    elif side == 'left':
        dy = (y1 + y2) // 2 - door_w // 2
        draw.rectangle([x2 - door_h, dy, x2 + 2, dy + door_w], fill=CORRIDOR_FILL)
    elif side == 'right':
        dy = (y1 + y2) // 2 - door_w // 2
        draw.rectangle([x1 - 2, dy, x1 + door_h, dy + door_w], fill=CORRIDOR_FILL)

    # Unit label
    name = u.get('name', '')
    code = u.get('code', '')
    area = u.get('area')

    uw = x2 - x1
    uh = y2 - y1

    # Store name (bold, centered)
    if uh > 24:
        # Truncate long names to fit
        display_name = name
        nw, nh = _compute_text_size(draw, display_name, f_bold)
        max_name_w = uw - 8
        while nw > max_name_w and len(display_name) > 3:
            display_name = display_name[:-1]
            nw, nh = _compute_text_size(draw, display_name + '..', f_bold)
        if nw > max_name_w:
            display_name = name[:max(3, max_name_w // 8)] + '..'

        _draw_text_centered(draw, (x1 + x2) / 2, (y1 + y2) / 2 - 7, display_name, f_bold, fill=TEXT_DARK)

        # Code below name
        _draw_text_centered(draw, (x1 + x2) / 2, (y1 + y2) / 2 + 7, code, f_sml, fill=TEXT_MUTED)

        # Area if room
        if area and uh > 38:
            _draw_text_centered(draw, (x1 + x2) / 2, (y1 + y2) / 2 + 19, f'{area}m²', f_sml, fill=TEXT_MUTED)
    else:
        # Small unit: just show code
        _draw_text_centered(draw, (x1 + x2) / 2, (y1 + y2) / 2, code, f_sml, fill=TEXT_DARK)


def _draw_legend(draw, img_w, img_h, margin_b, f_reg):
    """Draw status legend at the bottom of the image."""
    ly = img_h - margin_b + 6
    items = [
        ('#22c55e', 'Occupied'),
        ('#ef4444', 'Vacant'),
        ('#a855f7', 'Reserved'),
        ('#6b7280', 'Maintenance'),
    ]

    # Total legend width
    total_lw = sum(_compute_text_size(draw, lbl, f_reg)[0] for _, lbl in items)
    total_lw += len(items) * 28  # color boxes + spacing
    start_x = (img_w - total_lw) // 2

    cx = start_x
    for color, label in items:
        # Color swatch
        draw.rectangle([cx, ly, cx + 12, ly + 12], fill=color, outline='#cbd5e1')
        # Label
        draw.text((cx + 16, ly - 1), label, fill=TEXT_MUTED, font=f_reg)
        lw, _ = _compute_text_size(draw, label, f_reg)
        cx += 16 + lw + 20


async def main():
    """Generate floor plans for floors that have units with hotspot data."""
    async with AsyncSessionLocal() as db:
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

            # Build unit data list
            units_data = []
            for u in units:
                hd = u.hotspot_data or {}
                units_data.append({
                    'id': u.id,
                    'code': u.code,
                    'name': u.name,
                    'status': u.status.value,
                    'area': u.gross_area,
                    'layout_type': u.layout_type.value if u.layout_type else 'retail',
                    'hotspot_data': hd,
                })

            # Generate image
            print(f"Generating floor plan for F{floor_id} ({unit_count} units)...")
            image_bytes = generate_floor_image(units_data, floor_id)

            # Save image
            filename = f'floor_{floor_id}_plan.png'
            filepath = upload_dir / filename
            with open(filepath, 'wb') as f:
                f.write(image_bytes)
            image_url = f'/uploads/{filename}'
            print(f"  Saved: {filepath}")

            # Deactivate existing plans
            await db.execute(
                text('UPDATE floor_plans SET is_active = false WHERE floor_id = :fid'),
                {'fid': floor_id}
            )

            # Build hotspots from computed layout (we need to map unit positions)
            # Since the image generator computes layout dynamically, we re-compute here
            hotspots = _build_hotspots_from_layout(units_data, floor_id)

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


def _build_hotspots_from_layout(units_data, floor_number):
    """Build hotspot coordinates matching the visual layout in the image."""
    margin_l, margin_r = 20, 20
    margin_t, margin_b = 52, 36
    plan_x = margin_l
    plan_y = margin_t
    plan_w = IMG_WIDTH - margin_l - margin_r
    plan_h = IMG_HEIGHT - margin_t - margin_b
    corr_w = 72

    unit_rects = _layout_units(units_data, plan_x, plan_y, plan_w, plan_h, corr_w)

    hotspots = []
    for i, ur in enumerate(unit_rects):
        x1, y1, x2, y2 = ur['rect']
        u = ur['data']
        hd = u.get('hotspot_data', {})
        hotspots.append({
            'unit_id': u['id'],
            'unit_code': u['code'],
            'x': x1,
            'y': y1,
            'w': x2 - x1,
            'h': y2 - y1,
            'shape': 'rect',
        })
    return hotspots


if __name__ == '__main__':
    asyncio.run(main())
