"""Generate infrastructure-only floor plan base images for CAMP.

Base image contains ONLY architectural elements:
- Outer building walls
- Corridor walkways (ring layout)
- Central atrium area
- Escalators, elevators, restrooms
- Main entrance, fire exits
- Floor title bar with scale indicator

Store units are rendered as interactive hotspot overlays by the frontend,
NOT baked into this image. This allows drag-to-edit without regenerating.

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

# ── Color palette (architectural blueprint style) ────────────────
BG_WHITE = '#ffffff'
WALL_COLOR = '#1e293b'
WALL_THICK = 4
CORRIDOR_FILL = '#f8fafc'
ATRIUM_FILL = '#f1f5f9'
ATRIUM_BORDER = '#cbd5e1'
TEXT_DARK = '#334155'
TEXT_MUTED = '#94a3b8'
ACCENT_CAMP = '#2563eb'

# Facility colors
FACILITY_FILL = '#f1f5f9'
FACILITY_BORDER = '#94a3b8'
ESC_LINE = '#cbd5e1'
ENTRANCE_FILL = '#eff6ff'
ENTRANCE_BORDER = ACCENT_CAMP
FIRE_EXIT_FILL = '#fef2f2'
FIRE_EXIT_BORDER = '#fca5a5'


def _load_fonts():
    """Load fonts, falling back gracefully."""
    paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    ]
    try:
        return (
            ImageFont.truetype(paths[0], 11),
            ImageFont.truetype(paths[1], 15),
            ImageFont.truetype(paths[0], 9),
            ImageFont.truetype(paths[1], 18),
        )
    except Exception:
        d = ImageFont.load_default()
        return d, d, d, d


def _text_size(draw, text, font):
    b = draw.textbbox((0, 0), text, font=font)
    return b[2] - b[0], b[3] - b[1]


def _text_centered(draw, cx, cy, text, font, fill=TEXT_DARK):
    w, h = _text_size(draw, text, font)
    draw.text((cx - w / 2, cy - h / 2), text, fill=fill, font=font)


def generate_base_image(floor_number: int) -> bytes:
    """Generate an infrastructure-only floor plan base image (NO units)."""

    img = Image.new('RGB', (IMG_WIDTH, IMG_HEIGHT), BG_WHITE)
    draw = ImageDraw.Draw(img)
    f_reg, f_bold, f_sml, f_ttl = _load_fonts()

    # ═══ Plan area ═══
    mx = 20          # margin left/right
    mt = 52          # title bar height
    mb = 28          # bottom info bar height
    px, py = mx, mt
    pw = IMG_WIDTH - mx * 2
    ph = IMG_HEIGHT - mt - mb

    # Corridor width along perimeter
    cw = 80

    # ── Title bar ──
    draw.rectangle([0, 0, IMG_WIDTH, mt], fill='#f8fafc')
    draw.line([(0, mt - 1), (IMG_WIDTH, mt - 1)], fill='#e2e8f0')
    names = {1: 'L1 / 1F', 2: 'L2 / 2F', 3: 'L3 / 3F', 4: 'L4 / 4F', 5: 'L5 / 5F'}
    title = f'Sunshine Plaza   {names.get(floor_number, str(floor_number) + "F")}'
    draw.text((20, 15), title, fill=TEXT_DARK, font=f_ttl)

    # Scale indicator right side
    scale_text = f'1 : {200 - floor_number * 10}'
    sw, _ = _text_size(draw, scale_text, f_reg)
    draw.text((IMG_WIDTH - sw - 16, 17), scale_text, fill=TEXT_MUTED, font=f_reg)

    # Compass hint
    draw.text((IMG_WIDTH // 2 - 10, 14), 'N', fill=ACCENT_CAMP, font=f_bold)

    # ── Outer wall (thick) ──
    draw.rectangle(
        [px, py, px + pw, py + ph],
        outline=WALL_COLOR, width=WALL_THICK
    )

    # ── Inner structural columns (dots at corners of inner area) ──
    ix = px + cw
    iy = py + cw
    iw = pw - 2 * cw
    ih = ph - 2 * cw
    col_r = 6
    for corner in [(ix, iy), (ix + iw, iy), (ix, iy + ih), (ix + iw, iy + ih)]:
        cx_, cy_ = corner
        draw.ellipse(
            [cx_ - col_r, cy_ - col_r, cx_ + col_r, cy_ + col_r],
            fill=WALL_COLOR
        )

    # ── Corridor ring (perimeter walkway) ──
    # Top corridor
    draw.rectangle([px, py, px + pw, py + cw], fill=CORRIDOR_FILL)
    # Bottom corridor
    draw.rectangle([px, py + ph - cw, px + pw, py + ph], fill=CORRIDOR_FILL)
    # Left corridor
    draw.rectangle([px, py, px + cw, py + ph], fill=CORRIDOR_FILL)
    # Right corridor
    draw.rectangle([px + pw - cw, py, px + pw, py + ph], fill=CORRIDOR_FILL)

    # Corner fills (round out corridor corners)
    csz = cw + 8
    draw.rectangle([px, py, px + csz, py + csz], fill=CORRIDOR_FILL)
    draw.rectangle([px + pw - csz, py, px + pw, py + csz], fill=CORRIDOR_FILL)
    draw.rectangle([px, py + ph - csz, px + csz, py + ph], fill=CORRIDOR_FILL)
    draw.rectangle([px + pw - csz, py + ph - csz, px + pw, py + ph], fill=CORRIDOR_FILL)

    # Corridor center line (subtle guide)
    cl_off = cw // 2
    draw.line([(px + cl_off, py + cw), (px + cl_off, py + ph - cw)], fill='#e2e8f0', width=1)
    draw.line([(px + pw - cl_off, py + cw), (px + pw - cl_off, py + ph - cw)], fill='#e2e8f0', width=1)
    draw.line([(px + cw, py + cl_off), (px + pw - cw, py + cl_off)], fill='#e2e8f0', width=1)
    draw.line([(px + cw, py + ph - cl_off), (px + pw - cw, py + ph - cl_off)], fill='#e2e8f0', width=1)

    # ── Central Atrium ──
    ax = px + cw + 16
    ay = py + cw + 16
    aw = pw - 2 * cw - 32
    ah = ph - 2 * cw - 32
    draw.rectangle([ax, ay, ax + aw, ay + ah], fill=ATRIUM_FILL, outline=ATRIUM_BORDER, width=1)

    # Atrium decorative pattern (subtle cross lines)
    mid_ax = ax + aw // 2
    mid_ay = ay + ah // 2
    draw.line([(mid_ax, ay + 10), (mid_ax, ay + ah - 10)], fill='#e2e8f0', width=1)
    draw.line([(ax + 10, mid_ay), (ax + aw - 10, mid_ay)], fill='#e2e8f0', width=1)

    # Atrium label (watermark style)
    _text_centered(draw, mid_ax, mid_ay, 'ATRIUM', f_sml, fill='#d1d5db')

    # ── Facilities ──
    mid_x = px + pw // 2
    mid_y = py + ph // 2

    # Escalator (center-left of atrium)
    esc_w = 32
    esc_h = 100
    ex = mid_x - esc_w - 24
    ey = mid_y - esc_h // 2
    draw.rectangle([ex, ey, ex + esc_w, ey + esc_h],
                   fill=FACILITY_FILL, outline=FACILITY_BORDER, width=1)
    # Step lines
    for i in range(7):
        sy = ey + 12 + i * 12
        draw.line([(ex + 5, sy), (ex + esc_w - 5, sy)], fill=ESC_LINE, width=1)
    # Arrow indicators
    tri_y_top = ey + 6
    tri_y_bot = ey + esc_h - 8
    draw.polygon([(ex + esc_w // 2, tri_y_top),
                   (ex + esc_w // 2 - 5, tri_y_top + 8),
                   (ex + esc_w // 2 + 5, tri_y_top + 8)],
                  fill=ESC_LINE)
    draw.polygon([(ex + esc_w // 2, tri_y_bot + 8),
                   (ex + esc_w // 2 - 5, tri_y_bot),
                   (ex + esc_w // 2 + 5, tri_y_bot)],
                  fill=ESC_LINE)
    _text_centered(draw, ex + esc_w / 2, ey + esc_h + 10, 'ESC', f_sml, fill=TEXT_MUTED)

    # Elevator bank (center-right of atrium)
    elv_x = mid_x + 24
    elv_y = mid_y - 22
    elv_sz = 36
    draw.rectangle([elv_x, elv_y, elv_x + elv_sz, elv_y + elv_sz],
                   fill=FACILITY_FILL, outline=FACILITY_BORDER, width=1)
    # Two elevator boxes inside
    box_gap = 4
    box_sz = (elv_sz - box_gap) // 2
    draw.rectangle([elv_x + 4, elv_y + 4, elv_x + 4 + box_sz, elv_y + 4 + box_sz],
                   outline='#94a3b8', width=1)
    draw.rectangle([elv_x + 4 + box_sz + box_gap, elv_y + 4,
                   elv_x + 4 + box_sz + box_gap + box_sz, elv_y + 4 + box_sz],
                   outline='#94a3b8', width=1)
    _text_centered(draw, elv_x + elv_sz / 2, elv_y + elv_sz + 10, 'ELEV', f_sml, fill=TEXT_MUTED)

    # Restrooms (left of escalator)
    rr_x = ex - 36
    rr_y = mid_y - 22
    rr_sz = 36
    draw.rectangle([rr_x, rr_y, rr_x + rr_sz, rr_y + rr_sz],
                   fill=FACILITY_FILL, outline=FACILITY_BORDER, width=1)
    # WC symbols (M/F split)
    half = rr_sz // 2 - 2
    draw.rectangle([rr_x + 3, rr_y + 3, rr_x + 3 + half, rr_y + 3 + half],
                   outline='#a1a1aa', width=1)
    draw.rectangle([rr_x + 3 + half + 4, rr_y + 3,
                   rr_x + 3 + half + 4 + half, rr_y + 3 + half],
                   outline='#a1a1aa', width=1)
    _text_centered(draw, rr_x + 3 + half / 2, rr_y + 3 + half / 2, 'M', f_sml, fill=TEXT_MUTED)
    _text_centered(draw, rr_x + 3 + half + 4 + half / 2, rr_y + 3 + half / 2, 'F', f_sml, fill=TEXT_MUTED)
    _text_centered(draw, rr_x + rr_sz / 2, rr_y + rr_sz + 8, 'WC', f_sml, fill=TEXT_MUTED)

    # Main entrance (bottom center, breaks outer wall)
    ent_w = 90
    ent_h = WALL_THICK + 4
    ent_x = mid_x - ent_w // 2
    ent_y = py + ph - WALL_THICK - 2
    # Door opening (break in wall)
    draw.rectangle([ent_x - 4, ent_y - 4, ent_x + ent_w + 4, ent_y + ent_h + 4],
                   fill=ENTRANCE_FILL, outline=ENTRANCE_BORDER, width=1)
    # Door swing arc (suggestive) - draw as simple curve
    swing_pts = [
        (ent_x + ent_w - 4, ent_y),
        (ent_x + ent_w + 20, ent_y - 20),
        (ent_x + ent_w + 40, ent_y),
    ]
    if len(swing_pts) >= 2:
        draw.line(swing_pts, fill=ACCENT_CAMP, width=1)
    _text_centered(draw, mid_x, ent_y + ent_h / 2, 'MAIN ENTRANCE', f_sml, fill=ACCENT_CAMP)

    # Secondary entrance (top center)
    sec_ent_w = 60
    sec_ent_x = mid_x - sec_ent_w // 2
    sec_ent_y = py - 2
    draw.rectangle([sec_ent_x - 3, sec_ent_y - 3, sec_ent_x + sec_ent_w + 3, sec_ent_y + WALL_THICK + 3],
                   fill=ENTRANCE_FILL, outline=FACILITY_BORDER, width=1)
    _text_centered(draw, mid_x, sec_ent_y + 4, 'ENTRY', f_sml, fill=TEXT_MUTED)

    # Fire exit markers (all four corners, outside wall)
    fe_w = 26
    fe_h = 12
    fe_margin = 4
    # Top-left (outside top-left corner)
    draw.rectangle([px - fe_margin - fe_w, py - fe_margin - fe_h,
                    px - fe_margin, py - fe_margin],
                   fill=FIRE_EXIT_FILL, outline=FIRE_EXIT_BORDER, width=1)
    _text_centered(draw, px - fe_margin - fe_w / 2, py - fe_margin - fe_h / 2, 'EXIT', f_sml, fill='#ef4444')
    # Top-right
    draw.rectangle([px + pw + fe_margin, py - fe_margin - fe_h,
                    px + pw + fe_margin + fe_w, py - fe_margin],
                   fill=FIRE_EXIT_FILL, outline=FIRE_EXIT_BORDER, width=1)
    _text_centered(draw, px + pw + fe_margin + fe_w / 2, py - fe_margin - fe_h / 2, 'EXIT', f_sml, fill='#ef4444')
    # Bottom-left
    draw.rectangle([px - fe_margin - fe_w, py + ph + fe_margin,
                    px - fe_margin, py + ph + fe_margin + fe_h],
                   fill=FIRE_EXIT_FILL, outline=FIRE_EXIT_BORDER, width=1)
    _text_centered(draw, px - fe_margin - fe_w / 2, py + ph + fe_margin + fe_h / 2, 'EXIT', f_sml, fill='#ef4444')
    # Bottom-right
    draw.rectangle([px + pw + fe_margin, py + ph + fe_margin,
                    px + pw + fe_margin + fe_w, py + ph + fe_margin + fe_h],
                   fill=FIRE_EXIT_FILL, outline=FIRE_EXIT_BORDER, width=1)
    _text_centered(draw, px + pw + fe_margin + fe_w / 2, py + ph + fe_margin + fe_h / 2, 'EXIT', f_sml, fill='#ef4444')

    # Service/stairwell indicators (small squares in corridor areas)
    svc_sz = 22
    # Top-right corridor
    draw.rectangle([px + pw - cw - svc_sz - 8, py + 8,
                    px + pw - cw - 8, py + 8 + svc_sz],
                   fill='#fafafa', outline='#d4d4d8', width=1)
    _text_centered(draw, px + pw - cw - 8 - svc_sz / 2, py + 8 + svc_sz / 2, 'STAIR', f_sml, fill='#d4d4d8')
    # Bottom-left corridor
    draw.rectangle([px + cw + 8, py + ph - 8 - svc_sz,
                    px + cw + 8 + svc_sz, py + ph - 8],
                   fill='#fafafa', outline='#d4d4d8', width=1)
    _text_centered(draw, px + cw + 8 + svc_sz / 2, py + ph - 8 - svc_sz / 2, 'STAIR', f_sml, fill='#d4d4d8')

    # ── Bottom info bar ──
    draw.rectangle([0, IMG_HEIGHT - mb, IMG_WIDTH, IMG_HEIGHT], fill='#f8fafc')
    draw.line([(0, IMG_HEIGHT - mb), (IMG_WIDTH, IMG_HEIGHT - mb)], fill='#e2e8f0')

    # Info text left
    draw.text((16, IMG_HEIGHT - mb + 7), f'Floor Area: ~{9000 - floor_number * 200} m²',
              fill=TEXT_MUTED, font=f_reg)
    # Info text right
    info_right = f'CAMP v0.1 | Infrastructure Base Map'
    iw2, _ = _text_size(draw, info_right, f_reg)
    draw.text((IMG_WIDTH - iw2 - 16, IMG_HEIGHT - mb + 7), info_right,
              fill=TEXT_MUTED, font=f_reg)

    buf = BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


# ──── Unit layout computation (for initial hotspot placement) ────

def compute_unit_layout(units_data: list[dict]) -> list[dict]:
    """Compute initial unit positions along the corridor perimeter.

    Returns list of dicts with {x, y, w, h, unit_data}.
    This is used ONLY to set initial hotspot coordinates.
    """
    n = len(units_data)
    if n == 0:
        return []

    mx, my = 20, 52
    mw, mh = IMG_WIDTH - 40, IMG_HEIGHT - 80  # plan area
    cw = 80  # corridor width

    rects = []
    inner_x = mx + cw
    inner_y = my + cw
    inner_w = mw - 2 * cw
    inner_h = mh - 2 * cw

    # Distribute units: top/bottom get horizontal strips, sides get vertical
    top_units = []
    bot_units = []
    left_units = []
    right_units = []

    if n <= 4:
        for i, u in enumerate(units_data):
            [top_units, right_units, bot_units, left_units][i % 4].append(u)
    elif n <= 8:
        ps = max((n + 3) // 4, 1)
        for i, u in enumerate(units_data):
            [top_units, right_units, bot_units, left_units][min(i // ps, 3)].append(u)
    else:
        half = (n + 1) // 2
        top_units = units_data[:half]
        bot_units = units_data[half:]

    gap = 6
    pad = 4

    # Top row
    if top_units:
        usable = inner_w - pad * 2
        total_wt = sum(_area_weight(u) for u in top_units)
        cx = inner_x + pad
        for u in top_units:
            w = max(int(usable * (_area_weight(u) / total_wt)), 80)
            h = cw - pad * 2
            rects.append({'x': cx, 'y': my + pad, 'w': w, 'h': h, 'data': u})
            cx += w + gap

    # Bottom row
    if bot_units:
        usable = inner_w - pad * 2
        total_wt = sum(_area_weight(u) for u in bot_units)
        cx = inner_x + pad
        for u in bot_units:
            w = max(int(usable * (_area_weight(u) / total_wt)), 80)
            h = cw - pad * 2
            rects.append({'x': cx, 'y': my + mh - cw - pad, 'w': w, 'h': h, 'data': u})
            cx += w + gap

    # Right column
    if right_units:
        usable = inner_h - pad * 2
        total_wt = sum(_area_weight(u) for u in right_units)
        cy = inner_y + pad
        for u in right_units:
            uh = max(int(usable * (_area_weight(u) / total_wt)), 60)
            uw = cw - pad * 2
            rects.append({'x': mx + mw - cw - pad, 'y': cy, 'w': uw, 'h': uh, 'data': u})
            cy += uh + gap

    # Left column
    if left_units:
        usable = inner_h - pad * 2
        total_wt = sum(_area_weight(u) for u in left_units)
        cy = inner_y + pad
        for u in left_units:
            uh = max(int(usable * (_area_weight(u) / total_wt)), 60)
            uw = cw - pad * 2
            rects.append({'x': mx + pad, 'y': cy, 'w': uw, 'h': uh, 'data': u})
            cy += uh + gap

    return rects


def _area_weight(u):
    a = u.get('area', 100) or 100
    lt = u.get('layout_type', 'retail')
    if lt == 'anchor':
        return a * 2.5
    elif lt == 'kiosk':
        return a * 0.4
    return a


async def main():
    """Generate infrastructure base images + create FloorPlan records with hotspots."""
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

            # Build unit data for layout computation
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

            # Generate INFRASTRUCTURE-ONLY base image (no units!)
            print(f"Generating base map for F{floor_id} ({unit_count} units)...")
            image_bytes = generate_base_image(floor_id)

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

            # Compute initial hotspot positions from layout algorithm
            layout_rects = compute_unit_layout(units_data)
            hotspots = []
            for lr in layout_rects:
                u = lr['data']
                hotspots.append({
                    'unit_id': u['id'],
                    'unit_code': u['code'],
                    'x': lr['x'],
                    'y': lr['y'],
                    'w': lr['w'],
                    'h': lr['h'],
                    'shape': 'rect',
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
            print(f"  Created FloorPlan record: {fp.id} ({len(hotspots)} hotspots)")

    print("\nDone! Infrastructure base maps generated successfully.")
    print("Units are rendered as interactive overlay hotspots (not baked into image).")


if __name__ == '__main__':
    asyncio.run(main())
