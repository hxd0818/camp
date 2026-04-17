# CAMP Platform Design Document

**Date**: 2026-04-17
**Project**: CAMP (Commercial Asset Management Platform)
**Status**: Approved

## Overview

CAMP is a commercial real estate lease operation platform focused on shopping mall management. The core differentiator is **floor plan visualization with interactive hotspots** for intuitive unit management.

## Core Business Model

- **Target**: Shopping malls / commercial real estate
- **Tenants**: Merchants / retail store operators
- **Mode**: Single-tenant first, multi-tenant ready (tenant_id field reserved)
- **AI Feature**: Contract import with automatic information extraction and unit matching

## Architecture

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14 (App Router) | Mature, SSR support |
| UI | shadcn/ui + Tailwind CSS | Customizable, clean |
| Data Fetching | TanStack Query | Server state management |
| Floor Plan Rendering | HTML/CSS overlay | Lightweight, no extra deps |
| Backend | FastAPI (Python 3.11+) | High performance, auto-docs |
| ORM | SQLAlchemy 2.0 (async) | Mature, async-native |
| Database | PostgreSQL 16 | Reliable, JSON for hotspot data |
| File Storage | Local (MVP) / MinIO (future) |
| Auth | JWT + httpOnly cookie | Security standard |
| Container | Docker Compose | Unified dev environment |

### System Diagram

```
Browser (Next.js 14)
    |
    | HTTP/REST API
    v
FastAPI Backend
+------------------+------------------+
|   Asset Module   | Tenant/Contract   |
|                  | Finance/Ops       |
+------------------+------------------+
         SQLAlchemy 2.0 (async)
    |               |
PostgreSQL 16      Redis
(+ pgvector)       (cache)
```

## Data Model

### Entity Relationships

```
Mall (Shopping Center)
|-- Building
|   |-- Floor
|   |   |-- Unit (Store Unit) - CORE ENTITY
|   |   |   |-- area, layout_type, status
|   |   |   |-- floor_plan_hotspot coords
|   |   |
|   |   |-- FloorPlan (Floor Blueprint)
|   |   |   |-- image_url
|   |   |   |-- hotspots: [{unit_id, x, y, w, h, shape}]
|   |   |
|   |   |-- Tenant (Merchant)
|   |       |-- Contract (Lease Agreement)
|   |       |   |-- Invoice (Billing)
|   |       |   |-- Payment (Payment Record)
|   |       |
|   |       |-- WorkOrder (Maintenance)
|
|-- PropertyManager
|-- MallConfig
```

### Key Design: Floor Plan Hotspots

`FloorPlan.hotspots` stores per-unit coordinates on the blueprint image:
- `unit_id`: linked Unit record
- `x, y`: top-left position (percentage or pixels)
- `width, height`: hotspot dimensions
- `shape`: rect | polygon (for irregular units)

Frontend renders image as background with absolutely positioned div/SVG overlays as clickable hotspots.

## Floor Plan Visualization Flow

1. Upload floor plan image
2. Annotate unit hotspots on the image
3. Link hotspots to Unit records
4. User opens floor plan view -> renders image + hotspot overlay
5. Click unit -> detail panel shows:
   - Tenant name, contract status
   - Area, rent amount, expiry date
   - Arrears status, work order count

Hotspot colors indicate status:
- Green: Occupied (leased)
- Red: Vacant
- Yellow: Expiring soon (< 90 days)
- Gray: Under maintenance

## AI Contract Import (MVP)

### Flow

```
Upload contract (PDF/image)
        |
        v
LLM extracts structured data:
- tenant_name, unit_code/number
- area, rent_amount, currency
- lease_start, lease_end
- rent_terms, deposit
        |
        v
Auto-match to unit (by unit_code/name fuzzy match)
        |
        v
Preview on floor plan with highlighted match
        |
        v
User confirms -> Create contract + link unit
```

### Technical Implementation

- Backend: LLM API call (qwen/ollama hybrid) for structured extraction
- Matching: fuzzy match on `unit_code` or `unit_name`
- Frontend: Import preview on floor plan view, user confirmation before save

## Project Structure

```
camp/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    # Dashboard
│   │   ├── malls/
│   │   │   ├── page.tsx                # Mall list
│   │   │   └── [mallId]/
│   │   │       ├── page.tsx            # Mall overview
│   │   │       ├── floors/
│   │   │       │   └── [floorId]/
│   │   │       │       └── page.tsx    # Floor plan view (CORE)
│   │   │       ├── tenants/page.tsx
│   │   │       └── contracts/page.tsx
│   │   ├── finance/page.tsx
│   │   └── operations/page.tsx
│   ├── components/
│   │   ├── floor-plan/                 # CORE components
│   │   │   ├── FloorPlanViewer.tsx
│   │   │   ├── HotspotOverlay.tsx
│   │   │   └── UnitDetailPanel.tsx
│   │   ├── ui/                         # shadcn/ui
│   │   ├── mall/
│   │   ├── tenant/
│   │   └── contract/
│   ├── lib/
│   │   ├── api.ts                      # API client
│   │   └── types.ts                    # Shared types
│   └── ...
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/                     # SQLAlchemy models
│   │   ├── schemas/                    # Pydantic schemas
│   │   ├── api/v1/                     # API routes
│   │   └── services/                   # Business logic
│   ├── tests/
│   ├── alembic/
│   └── requirements.txt
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── CHANGELOG.md
├── CLAUDE.md
└── README.md
```

## MVP Modules

| Module | MVP Features |
|--------|-------------|
| Asset Management | Mall > Building > Floor > Unit hierarchy; status tracking |
| Floor Plan Visualization | Image upload, hotspot annotation, click-to-view details |
| Tenant & Contracts | CRUD + AI smart import (LLM extract + auto-match unit) |
| Financial Management | Invoice generation, payment tracking, arrears stats |
| Operations Management | Work order creation, status tracking |
| Multi-tenant Ready | All tables include nullable `tenant_id` field |

## API Design Principles

- RESTful endpoints under `/api/v1/`
- Consistent response envelope: `{ success, data?, error?, meta? }`
- Pagination support on list endpoints
- Authentication via JWT Bearer token + httpOnly cookie
- CORS configured for frontend origin
