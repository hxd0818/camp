# CAMP - Commercial Asset Management Platform

Commercial real estate lease operation platform for shopping mall management with interactive floor plan visualization.

## Features

- **Floor Plan Visualization**: Interactive floor plans with clickable unit hotspots
- **AI Contract Import**: Automatic contract data extraction and unit matching via LLM
- **Tenant Lifecycle Management**: Complete tenant and contract management
- **Financial Tracking**: Invoice generation, payment recording, arrears monitoring
- **Operations Management**: Work order creation and maintenance tracking

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), shadcn/ui, Tailwind CSS |
| Backend | FastAPI (Python 3.11+), SQLAlchemy 2.0 (async) |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| Container | Docker Compose |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for frontend dev tools outside container)
- Python 3.11+ (for backend dev tools outside container)

### 1. Clone and Configure

```bash
git clone <repo-url>
cd camp
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start Services

```bash
docker compose -f docker/docker-compose.yml up -d
```

This starts:
- PostgreSQL on port 5433
- Redis on port 6380
- Backend API on port 8000
- Frontend on port 3000

### 3. Access

- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Project Structure

```
camp/
├── frontend/           # Next.js application
│   ├── app/           # Pages (App Router)
│   ├── components/    # React components
│   │   └── floor-plan/ # Core floor plan visualization
│   └── lib/           # Utilities, API client, types
├── backend/            # FastAPI application
│   ├── app/
│   │   ├── api/v1/    # REST API endpoints
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic validation
│   │   └── services/  # Business logic (incl. AI)
│   └── tests/         # Test suite
├── docker/             # Docker configuration
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
└── docs/plans/        # Design documents
```

## Core Workflow: Floor Plan Management

1. Upload floor plan image for a building floor
2. Define hotspots (clickable regions) for each store unit
3. Link hotspots to Unit records in the database
4. View interactive floor plan with color-coded unit statuses
5. Click any unit to see tenant, contract, and financial details

## Core Workflow: AI Contract Import

1. Upload contract document (PDF/image)
2. LLM extracts: tenant name, unit code, rent, dates, etc.
3. System auto-matches extracted unit code to existing units
4. Review extraction results and match confidence
5. Confirm to create contract record linked to the unit

## License

Private - All rights reserved
