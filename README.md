# Atheron HRMS

Enterprise Human Resource Management & Payroll System.

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+ (optional for foundation phase)

### Setup

```bash
# Clone and install
npm install

# Configure environment
cp .env.example .env

# Start database services
docker compose -f docker/docker-compose.yml up -d

# Run migrations
npm run db:migrate

# Seed foundation data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed database |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete Software Architecture Document (Version 1.0 Approved).

### Tech Stack

- **Frontend:** Next.js 15+, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend:** Next.js App Router, Server Actions, Route Handlers
- **Database:** PostgreSQL + Prisma ORM
- **Validation:** Zod
- **State:** TanStack Query

## Project Structure

```
src/
├── app/              # Next.js routes and pages
├── components/       # Shared UI and layout components
├── modules/          # Feature modules (bounded contexts)
├── shared/           # Cross-cutting utilities, types, permissions
├── infrastructure/   # Database, storage, logging, security
├── lib/              # App-level utilities
└── styles/           # Global styles and theme tokens
```

Each folder contains a `README.md` explaining its purpose.

## Development Guide

1. Read `docs/ARCHITECTURE.md` before implementing any module
2. Follow the module pattern: `domain/` → `application/` → `infrastructure/`
3. Never put business logic in UI components
4. Use Zod schemas for all validation
5. Server-side permission checks are mandatory

## Coding Standards

- TypeScript strict mode
- Conventional Commits: `feat(module): description`
- ESLint + Prettier enforced
- See `docs/COMMIT_CONVENTIONS.md`

## Local Deployment

```bash
docker compose -f docker/docker-compose.yml up -d
npm run build
npm run start
```

## Current Phase

**Phase 1 — Foundation** (Complete)

- Project scaffolding
- Design system and layout shell
- Prisma configured (no business tables)
- Permission engine architecture
- Audit and logging abstractions
- Storage provider abstraction

**Next:** Phase 2 — Authentication & Core HR modules

## License

Proprietary — All rights reserved.
