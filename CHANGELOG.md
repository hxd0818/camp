# CAMP Changelog

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
# Access: http://localhost:3000 (frontend) | http://localhost:8000/docs (API)
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
