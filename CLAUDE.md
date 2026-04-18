# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Preferences

**CRITICAL**: Always communicate in Chinese (中文) with the user.

- Use Chinese for all responses, explanations, and discussions
- Address the user as "爸爸" (Dad) before answering
- Code comments should be in English (international standard)
- **All project documentation MUST be written in Chinese**, including but not limited to:
  - `CHANGELOG.md` 及每日详细日志 `CHANGELOG_YYYY-MM-DD.md`
  - 设计文档 (`docs/plans/` 目录下所有 .md 文件)
  - README、CLAUDE.md 等项目说明文件
  - commit message 摘要部分使用中文描述
- User-facing messages and UI text should be in Chinese

## Project Overview

CAMP (Commercial Asset Management Platform) is a commercial real estate lease operation platform focused on **shopping mall management**.

**Core Differentiator**: Floor plan visualization with interactive hotspots for intuitive unit management.
**AI Feature**: Contract import with automatic information extraction and unit matching via LLM.

## 1. Architecture

- **Monorepo**: Frontend and backend in one repository
- **Single-tenant first**: All tables have nullable `tenant_id` field for future multi-tenant support
- **Tech Stack**: Next.js 14 + FastAPI (Python) + PostgreSQL 16 + Redis 7
- **Containerized**: Docker Compose for all services

## 2. Core Modules

| Module | Description | Key Files |
|--------|-------------|-----------|
| Asset Management | Mall > Building > Floor > Unit hierarchy | `backend/app/models/mall.py`, `unit.py` |
| Floor Plan Visualization | Image upload, hotspot overlay, click-to-detail | `components/floor-plan/`, `api/v1/floor_plans.py` |
| Tenant & Contracts | CRUD + AI smart import | `models/tenant.py`, `contract.py`, `services/contract_ai.py` |
| Financial Management | Invoices, payments, arrears tracking | `api/v1/finance.py` |
| Operations | Work orders, maintenance | `api/v1/operations.py` |

## 3. Development Environment Policy (CRITICAL)

**MANDATORY**: All development must be done in Docker containers.

**Prohibited**:
- Running frontend/backend on local Python/Node.js
- Using `pip install` or `npm install` on host machine
- Direct database operations on host
- Using WebSocket

**Required**:
- Start all services: `docker compose -f docker/docker-compose.yml up -d`
- Execute commands inside containers: `docker exec`
- Run dev servers inside containers

### Database Connection (for docker exec)
- Container: `camp-postgres`
- User: `cdata`
- Password: `cdata_dev_password`
- Database: `cdata`
- Example: `docker exec camp-postgres psql -U cdata -d cdata -c "SQL"`

## 4. File Path Standards

```
frontend/
├── app/              # Pages only
├── components/       # Components only
├── hooks/            # Hooks
└── lib/              # Utilities

backend/
├── app/
│   ├── api/v1/       # API endpoints
│   ├── models/       # SQLAlchemy models
│   ├── schemas/      # Pydantic schemas
│   └── services/     # Business logic
└── tests/            # Tests
```

**Import Rules**:
```python
# CORRECT
from app.models.mall import Mall
from app.config import get_settings

# WRONG
from backend.app.models.mall import Mall
```

```typescript
// CORRECT
import { apiClient } from '@/lib/api'

// WRONG
fetch('/api/v1/xxx')
```

## 5. Coding Standards

- **Immutability**: Always create new objects, never mutate existing ones
- **Error Handling**: Handle errors at every level, never silently swallow
- **Input Validation**: Validate at system boundaries using Pydantic/Zod
- **No TODOs**: No TODO or commented-out code in final code
- **No Gradients**: Solid colors only in UI design
- **No Emojis**: Text alternatives in code and UI
- **Small Files**: <800 lines per file, high cohesion

## 6. Key Design Decisions

### Floor Plan Hotspot System
- Images stored as files, URLs in database
- Hotspot coordinates stored as JSON (`hotspots` column on `floor_plans`)
- Each hotspot links to a `Unit` record
- Colors determined by unit status + contract status (server-side `_get_status_color()`)
- Frontend renders as absolutely-positioned div overlays or SVG polygons

### AI Contract Import
- LLM API extracts structured data from PDF/image contracts
- Auto-matches to units by `unit_code` fuzzy matching
- Confidence score returned for user review
- User confirms before creating contract record

## 7. Testing Requirements

- Minimum 80% coverage required
- TDD workflow: Write test first (RED) -> Implement (GREEN) -> Refactor (IMPROVE)
- Use pytest with async support for backend
- Table-driven tests preferred

## 8. Changelog Policy (MANDATORY)

ALL changes MUST be documented in CHANGELOG.md immediately upon completion.

## Absolute Prohibited (CRITICAL)

```python
# WRONG: reserved word
metadata = Column(JSON)

# CORRECT
meta_data = Column(JSON)
```

```typescript
// WRONG: double backslash
document.cookie.match(/(^|;)\\s*csrf_token=([^;]*)/);

// CORRECT: single backslash
document.cookie.match(/(^|;)\s*csrf_token=([^;]*)/);
```

## Browser Automation

Use `agent-browser` for web automation tasks.
