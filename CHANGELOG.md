# CAMP Changelog

## [2026-04-18] v0.1.5 - Extended Unit Edit & AI Contract Import

### Overview
Extended unit detail panel with comprehensive edit fields and AI-powered contract upload with automatic data extraction.

### Key Highlights
- **Extended edit form**: monthly_rent, layout_type, lease_start, lease_end, description fields
- **AI contract upload**: Upload PDF/image contracts, LLM auto-extracts tenant/rent/date info
- **Import preview**: Shows confidence score, warnings, source filename before confirmation
- **Auto pre-fill**: Extracted data automatically populates the edit form for review

### Changed
- `frontend/components/floor-plan/UnitDetailPanel.tsx` - Full rewrite: extended form fields, AI import workflow, confirm/cancel flow, enhanced read-only view

---

## [2026-04-18] v0.1.4 - Polygon Shape Support for Units

### Overview
Replaced rectangle-only unit drawing with arbitrary polygon support. Users can now create units of any shape (L-shape, trapezoid, irregular) by clicking vertices on the canvas.

### Key Highlights
- **Polygon drawing mode**: click to add vertices (min 3), right-click undo, rubber-band preview
- **SVG polygon rendering**: HotspotOverlay uses SVG `<polygon>` for non-rectangular shapes
- **Vertex drag editing**: drag individual vertices to reshape polygons in edit mode
- **Backward compatible**: existing rect hotspots continue to work unchanged

### Changed
- `frontend/components/floor-plan/FloorPlanViewer.tsx` - Complete rewrite of add-unit flow (polygon vertices), HotspotOverlay (SVG polygon + vertex editing), save logic (persists shape+points)
- `frontend/lib/types.ts` - Added `points?: number[][]` and typed `shape` field to HotspotItem

### Fixed
- JSX div tag mismatch: main container missing closing tag
- New unit not persisting: now writes hotspot to floor_plan hotspots JSON column
- Unterminated template literal typo (`NEW' instead of 'NEW')

---

## [2026-04-18] v0.1.3 - Add Unit & Edit Mode Enhancements

### Overview
Added ability to create new units by clicking on the floor plan canvas in edit mode. Fixed syntax error preventing page load.

### Key Highlights
- Click-to-place new unit with drag-to-resize
- Confirm/cancel workflow before creating unit in database
- Fix: missing closing div tag in FloorPlanViewer main container

### Changed
- `frontend/components/floor-plan/FloorPlanViewer.tsx` - Added add-unit mode with click placement, drag resize, confirm UI
- `frontend/app/malls/[mallId]/floors/[floorId]/page.tsx` - Pass floorId prop to FloorPlanViewer

### Fixed
- JSX div tag mismatch: main container missing closing `</div>` causing "Unexpected token div" error
- New unit not appearing after creation: createUnit() only wrote to units table but did not add hotspot to floor_plan hotspots JSON column. Now also calls updateHotspots() to persist position.

---

## [2026-04-17] v0.1.2 - Floor Plan Image Generation

### Overview
Added automatic floor plan image generation using PIL. Generated PNG images with colored unit rectangles for all 3 floors (F1/F2/F3). Fixed async SQLAlchemy issues in render-data endpoint.

### Key Highlights
- Created gen_floorplans.py script that generates 1200x800 PNG floor plan images
- Images show colored rectangles per unit (green=occupied, red=vacant, etc.)
- Fixed render-data API greenlet error with selectinload eager loading
- Added static file serving for /uploads directory

### Fixed
- `backend/app/api/v1/floor_plans.py` - MissingGreenlet error when accessing unit.current_contract in async context
- `backend/scripts/gen_floorplans.py` - Multiple PIL syntax errors (rectangle, textbbox, line)

### Added
- **Floor Plan Generation**: `backend/scripts/gen_floorplans.py` - generates PNG images + creates FloorPlan DB records
- **Static File Serving**: `/uploads` mount in main.py for serving floor plan images
- **Pillow Dependency**: `Pillow==10.4.0` in requirements.txt

### Quick Start
```bash
# After seeding data, generate floor plans:
docker exec camp-backend python scripts/gen_floorplans.py
# View: http://localhost:3201/malls/1/floors/3 (F1 floor plan)
```

---

## [2026-04-17] v0.1.1 - Make Project Runnable

### Overview
Fixed critical bugs, added authentication, database migrations, seed data, and improved Docker configuration. Project is now fully runnable.

### Key Highlights
- Fixed ContractStatus enum SyntaxError (indentation bug)
- Fixed SQLAlchemy Base.metadata empty (models not imported)
- Added JWT authentication system (login + token validation)
- Configured Alembic async migrations for PostgreSQL
- Created demo seed data script (Sunshine Plaza mall + 14 units + 10 tenants)
- Improved Docker Compose with networks, healthchecks, restart policies

### Fixed
- `backend/app/models/contract.py:16` - ContractStatus.EXPIRED had wrong indentation causing SyntaxError
- `backend/app/models/__init__.py` - Models were never imported, so Base.metadata had no tables (init_db() created nothing)

### Added
- **Auth System**: `app/core/security.py` (JWT utils), `app/api/v1/auth.py` (login/me endpoints)
- **Database Migrations**: `alembic.ini`, `alembic/env.py` (async engine), `alembic/script.py.mako`
- **Seed Data**: `backend/scripts/seed_data.py` - creates Sunshine Plaza mall with buildings, floors, units, tenants, contracts, invoices, payments
- **Docker Improvements**: `.dockerignore`, named network (`camp-network`), enhanced healthchecks, restart policies, frontend node_modules volume isolation

### Changed
- `docker/docker-compose.yml` - added networks section, env_file, better healthchecks, restart policies
- `docker/Dockerfile.backend` - added curl for healthcheck support
- `docker/Dockerfile.frontend` - simplified build, create .next/uploads dirs at build time

### Quick Start
```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d --build
# Seed demo data:
docker exec camp-backend python scripts/seed_data.py
# Access: http://localhost:3201 (frontend) | http://localhost:8201/docs (API)
# Login: admin / admin123
```

---

## [2026-04-17] v0.1.0 - Initial Project Setup

### Overview
CAMP (Commercial Asset Management Platform) initial project scaffold. Complete monorepo structure with full-stack skeleton including the core floor plan visualization feature.

### Key Highlights
- Monorepo architecture: Next.js 14 + FastAPI + PostgreSQL
- **Floor plan visualization system** with image hotspot interaction
- **AI contract import service** (LLM-based extraction + auto unit matching)
- Complete CRUD APIs for malls, buildings, floors, units, tenants, contracts, invoices, work orders
- Docker Compose development environment
- Multi-tenant ready (tenant_id field on all tables)

### Added
- Backend: FastAPI application with all models, schemas, API routes, and services
- Backend: SQLAlchemy models for Mall, Building, Floor, Unit, FloorPlan, Tenant, Contract, Invoice, Payment, WorkOrder
- Backend: AI contract extraction service (`services/contract_ai.py`) with LLM integration and fuzzy unit matching
- Backend: Floor plan render-data endpoint for enriched hotspot visualization
- Frontend: Next.js 14 App Router with all pages (dashboard, mall list/detail, floor plan view, tenants, contracts, finance, operations)
- Frontend: Core floor plan components - FloorPlanViewer, HotspotOverlay, UnitDetailPanel
- Frontend: Unified API client (`lib/api.ts`) with all endpoint methods
- Frontend: TypeScript type definitions mirroring backend schemas
- Frontend: Contract page with AI import UI flow
- Docker: docker-compose.yml with postgres, redis, backend, frontend services
- Docker: Dockerfiles for backend (Python) and frontend (Node.js)
- Documentation: CLAUDE.md, README.md, design doc

### Files Created (~40 files)
- `backend/app/main.py`, `config.py`, `database.py`
- `backend/app/models/*.py` (6 model files)
- `backend/app/schemas/*.py` (6 schema files)
- `backend/app/api/v1/*.py` (7 route files)
- `backend/app/services/contract_ai.py`
- `backend/tests/conftest.py`
- `frontend/app/page.tsx` + 7 page routes
- `frontend/components/floor-plan/*.tsx` (3 core components)
- `frontend/lib/api.ts`, `lib/types.ts`
- `docker/docker-compose.yml`, `Dockerfile.backend`, `Dockerfile.frontend`
- `CLAUDE.md`, `README.md`, `.gitignore`, `.env.example`
- `docs/plans/2026-04-17-camp-platform-design.md`
