# Atheron HRMS — Software Architecture Document

**Project:** Atheron HRMS — Enterprise Human Resource Management & Payroll System  
**Document Type:** Permanent Architecture Guide  
**Version:** 1.0  
**Status:** Formally Approved  
**Last Updated:** 2026-07-23  
**Approved:** 2026-07-23  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Folder Structure](#3-folder-structure)
4. [Module Architecture](#4-module-architecture)
5. [Design Principles](#5-design-principles)
6. [Database Planning](#6-database-planning)
7. [Entity Planning](#7-entity-planning)
8. [Permission Architecture](#8-permission-architecture)
9. [Authentication Architecture](#9-authentication-architecture)
10. [UI Architecture](#10-ui-architecture)
11. [API Architecture](#11-api-architecture)
12. [Service Layer Architecture](#12-service-layer-architecture)
13. [Shared Components Strategy](#13-shared-components-strategy)
14. [Storage Strategy](#14-storage-strategy)
15. [Validation Strategy](#15-validation-strategy)
16. [Logging Strategy](#16-logging-strategy)
17. [Audit Strategy](#17-audit-strategy)
18. [Security Strategy](#18-security-strategy)
19. [Performance Strategy](#19-performance-strategy)
20. [Deployment Strategy](#20-deployment-strategy)
21. [Coding Standards](#21-coding-standards)
22. [Naming Standards](#22-naming-standards)
23. [Future Expansion Strategy](#23-future-expansion-strategy)
24. [Development Roadmap](#24-development-roadmap)
25. [Risks](#25-risks)
26. [Best Practices](#26-best-practices)
27. [Recommendations](#27-recommendations)

---

## 1. Executive Summary

Atheron HRMS is a production-grade, enterprise Human Resource Management System with integrated Payroll, designed for real business deployment at scale. It targets parity with platforms such as Zoho People, GreytHR, Keka HR, BambooHR, ERPNext HR, Odoo HR, SAP SuccessFactors, and Workday — with a modern stack, modular architecture, and long-term extensibility.

### Vision

Deliver a unified HR platform that handles the full employee lifecycle — from recruitment through separation — including attendance (multi-modal), leave, payroll (multi-country ready), performance, training, assets, expenses, and analytics — accessible via web admin portal, employee self-service portal, and future mobile clients.

### Core Technology Decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui | Server Components, type safety, enterprise UI primitives |
| Backend | Next.js App Router, Server Actions, Route Handlers | Unified full-stack, reduced operational surface |
| Database | PostgreSQL + Prisma ORM | ACID, relational integrity, mature ecosystem |
| Authentication | **Auth.js v5 (NextAuth)** | Production-ready, App Router native, extensible for 2FA |
| Caching | **Redis** + Next.js cache tags | Distributed cache, session store, rate limiting |
| Client State | **TanStack Query** + minimal **Zustand** | Server-first; client cache for interactive UI |
| Storage | **Abstracted Storage Provider** | S3 / R2 / MinIO / Local via single interface |
| Validation | **Zod** (shared schemas) | Single source of truth across client and server |

### Architectural Style

**Enterprise Clean Architecture** with strict layer separation:

```
Presentation → Application (Use Cases) → Domain → Infrastructure
```

Business logic never lives in UI components. All modules plug into the same patterns: repositories, services, permissions, audit, and validation.

### Non-Negotiable Constraints

- **No architecture redesign** in future phases — only extension.
- **No folder renames** — paths defined here are permanent.
- **No duplicate patterns** — one way to do each concern.
- **Backward compatibility** — schema migrations, API versioning, feature flags.
- **Scale target:** 100,000+ employees per tenant with branch/department partitioning.

---

## 2. High-Level Architecture

### 2.1 System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL ACTORS                                 │
├──────────────┬──────────────┬──────────────┬──────────────┬───────────────┤
│ Super Admin  │ HR / Accounts│   Managers   │  Employees   │ Mobile Apps   │
│   (Web)      │    (Web)     │    (Web)     │  (Portal)    │  (Future API) │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴───────┬───────┘
       │              │              │              │               │
       └──────────────┴──────────────┴──────────────┴───────────────┘
                                      │
                          ┌───────────▼───────────┐
                          │     NGINX (Reverse    │
                          │     Proxy + SSL)      │
                          └───────────┬───────────┘
                                      │
                          ┌───────────▼───────────┐
                          │   Next.js 15 App      │
                          │   (PM2 / Docker)      │
                          ├───────────────────────┤
                          │ Presentation Layer    │
                          │ Application Layer     │
                          │ Domain Layer          │
                          │ Infrastructure Layer  │
                          └───────────┬───────────┘
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
            ┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
            │  PostgreSQL  │  │    Redis     │  │   Storage    │
            │   (Primary)  │  │ Cache/Session│  │ S3/R2/MinIO  │
            └──────────────┘  └──────────────┘  └──────────────┘
                    │
            ┌───────▼──────┐
            │  (Future)    │
            │  Read Replica│
            │  Job Queue   │
            └──────────────┘
```

### 2.2 Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Presentation** | `src/app/`, `src/components/` | UI rendering, forms, tables, routing — delegates to application layer |
| **Application** | `src/modules/*/application/` | Use cases, orchestration, DTO mapping, permission checks |
| **Domain** | `src/modules/*/domain/` | Entities, value objects, domain rules, repository interfaces |
| **Infrastructure** | `src/infrastructure/` | Prisma repos, Redis, storage, email, external APIs |
| **Shared** | `src/shared/` | Cross-cutting: validation, utils, types, constants, permissions engine |

### 2.3 Request Flow (Web)

```
Browser Request
    → Middleware (auth, rate limit, tenant context)
    → Route Handler / Server Action / Server Component
    → Application Service (use case)
    → Permission Guard
    → Domain Logic
    → Repository (Prisma)
    → Audit Logger (async)
    → Response (typed, validated)
```

### 2.4 Request Flow (Mobile API — Future)

```
Mobile Client
    → /api/v1/* Route Handler
    → API Auth Middleware (Bearer JWT from Auth.js)
    → Same Application Services as Web
    → Standardized JSON Envelope
```

### 2.5 Multi-Tenancy Model

**Single database, row-level tenant isolation** via `company_id` on all tenant-scoped tables.

- Every query MUST filter by `company_id` (enforced at repository base class).
- Super Admin can operate across companies (explicit bypass with audit).
- Branch-level scoping via `branch_id` where applicable.
- Tenant context injected from session at middleware level.

### 2.6 Deployment Topology (Production)

```
Internet → Nginx (SSL termination, static caching)
         → PM2 cluster (Next.js instances)
         → PostgreSQL (primary)
         → Redis (sessions, cache, rate limits)
         → Object Storage (files)
         → (Future) Worker process for payroll/exports/notifications
```

---

## 3. Folder Structure

Permanent root structure. **Do not rename these folders in future phases.**

```
atheron-hrms/                          # Project root (repo name may differ)
├── docs/                              # Architecture, ADRs, runbooks
│   ├── ARCHITECTURE.md                # This document
│   ├── adr/                           # Architecture Decision Records
│   └── api/                           # OpenAPI specs (future)
├── prisma/                            # Prisma schema & migrations (Phase 2+)
│   ├── schema/
│   ├── migrations/
│   └── seed/
├── public/                            # Static assets
│   ├── fonts/
│   └── images/
├── src/
│   ├── app/                           # Next.js App Router (Presentation)
│   │   ├── (auth)/                    # Login, forgot password, 2FA
│   │   ├── (portal)/                  # Employee self-service portal
│   │   ├── (dashboard)/               # Admin/HR/Manager dashboards
│   │   │   ├── company/
│   │   │   ├── employees/
│   │   │   ├── attendance/
│   │   │   ├── leave/
│   │   │   ├── payroll/
│   │   │   ├── recruitment/
│   │   │   ├── performance/
│   │   │   ├── training/
│   │   │   ├── assets/
│   │   │   ├── expenses/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   └── audit/
│   │   ├── api/                       # Route Handlers
│   │   │   ├── v1/                    # Mobile & external API
│   │   │   ├── webhooks/
│   │   │   └── health/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── middleware.ts
│   ├── components/                    # Shared UI components
│   │   ├── ui/                        # shadcn/ui primitives
│   │   ├── layout/                    # Shell, sidebar, header, breadcrumbs
│   │   ├── data-table/                # TanStack Table wrappers
│   │   ├── forms/                     # Reusable form fields & patterns
│   │   ├── charts/                    # Recharts wrappers
│   │   ├── feedback/                  # Toasts, alerts, empty states
│   │   └── providers/                 # Theme, query, auth providers
│   ├── modules/                       # Feature modules (bounded contexts)
│   │   ├── company/
│   │   ├── branch/
│   │   ├── department/
│   │   ├── designation/
│   │   ├── employee/
│   │   ├── document/
│   │   ├── attendance/
│   │   ├── leave/
│   │   ├── holiday/
│   │   ├── shift/
│   │   ├── payroll/
│   │   ├── loan/
│   │   ├── advance/
│   │   ├── bonus/
│   │   ├── incentive/
│   │   ├── asset/
│   │   ├── recruitment/
│   │   ├── performance/
│   │   ├── training/
│   │   ├── expense/
│   │   ├── notification/
│   │   ├── report/
│   │   ├── analytics/
│   │   ├── audit/
│   │   ├── settings/
│   │   ├── permission/
│   │   ├── role/
│   │   └── dashboard/
│   ├── shared/                        # Cross-cutting shared code
│   │   ├── types/
│   │   ├── constants/
│   │   ├── utils/
│   │   ├── hooks/
│   │   ├── validation/                # Shared Zod schemas
│   │   ├── permissions/               # RBAC engine
│   │   ├── errors/                    # AppError hierarchy
│   │   ├── pagination/
│   │   ├── filtering/
│   │   └── config/
│   ├── infrastructure/                # External integrations
│   │   ├── database/                  # Prisma client, base repository
│   │   ├── cache/                     # Redis client & cache helpers
│   │   ├── storage/                   # Storage provider abstraction
│   │   ├── auth/                      # Auth.js configuration
│   │   ├── email/                     # Email provider abstraction
│   │   ├── sms/                       # SMS provider abstraction (future)
│   │   ├── queue/                     # Job queue (future)
│   │   ├── pdf/                       # PDF generation utilities
│   │   ├── excel/                     # ExcelJS utilities
│   │   └── logging/                   # Structured logging
│   ├── lib/                           # Thin re-exports & app-level glue
│   └── styles/                        # Tailwind v4 theme tokens
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx/
├── scripts/                           # DevOps & maintenance scripts
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 3.1 Module Internal Structure (Standard Pattern)

Every module under `src/modules/{module-name}/` follows this structure:

```
{module-name}/
├── domain/
│   ├── entities/              # Domain entity types & invariants
│   ├── value-objects/         # Email, Money, DateRange, etc.
│   ├── repositories/          # Repository interfaces (ports)
│   └── services/              # Pure domain services
├── application/
│   ├── use-cases/             # One file per use case
│   ├── dto/                   # Input/output DTOs
│   ├── mappers/               # Entity ↔ DTO mapping
│   └── actions/               # Server Actions (thin wrappers)
├── infrastructure/
│   └── repositories/          # Prisma repository implementations
├── validation/
│   └── schemas.ts             # Module-specific Zod schemas
├── components/                # Module-specific UI (if not shared)
├── hooks/                     # Module-specific React hooks
└── index.ts                   # Public module API (barrel export)
```

### 3.2 Import Rules

| From | Can Import |
|------|------------|
| `app/` | `components/`, `modules/*/application`, `modules/*/components`, `shared/`, `lib/` |
| `modules/*/application` | Same module `domain/`, `shared/`, `infrastructure/` interfaces |
| `modules/*/domain` | Only `shared/types`, other domain value objects |
| `infrastructure/` | All module domain interfaces, `shared/` |
| `components/` | `shared/`, `hooks/`, never direct Prisma |

**Forbidden:** UI → Prisma direct access. Application → UI imports. Cross-module domain imports (use application services or shared events).

---

## 4. Module Architecture

### 4.1 Module Registry

| Module | Code | Primary Entities | Depends On |
|--------|------|------------------|------------|
| Company | `company` | Company, CompanySettings | — |
| Branch | `branch` | Branch | company |
| Department | `department` | Department | company, branch |
| Designation | `designation` | Designation | company |
| Employee | `employee` | Employee, EmployeeProfile, EmergencyContact | company, branch, department, designation |
| Document | `document` | EmployeeDocument, DocumentType | employee, storage |
| Attendance | `attendance` | AttendanceRecord, AttendancePolicy, PunchLog | employee, shift |
| Leave | `leave` | LeaveType, LeaveBalance, LeaveRequest | employee, holiday |
| Holiday | `holiday` | Holiday, HolidayCalendar | company, branch |
| Shift | `shift` | Shift, ShiftAssignment, Roster | company, employee |
| Payroll | `payroll` | SalaryStructure, PayRun, Payslip, TaxConfig | employee, attendance, leave |
| Loan | `loan` | Loan, LoanRepayment | employee, payroll |
| Advance | `advance` | Advance, AdvanceRecovery | employee, payroll |
| Bonus | `bonus` | Bonus, BonusRule | employee, payroll |
| Incentive | `incentive` | Incentive, IncentiveRule | employee, payroll |
| Asset | `asset` | Asset, AssetAssignment, AssetCategory | employee, company |
| Recruitment | `recruitment` | JobPosting, Applicant, Interview | company, department |
| Performance | `performance` | ReviewCycle, Review, Goal, KPI | employee |
| Training | `training` | TrainingProgram, Enrollment, Certificate | employee |
| Expense | `expense` | ExpenseClaim, ExpenseItem, ExpensePolicy | employee |
| Notification | `notification` | Notification, NotificationTemplate, Channel | user |
| Report | `report` | ReportDefinition, ReportRun | all modules |
| Analytics | `analytics` | Aggregated metrics (materialized) | all modules |
| Audit | `audit` | AuditLog, SecurityLog | all modules |
| Settings | `settings` | SystemSetting, CompanySetting | company |
| Permission | `permission` | Permission, RolePermission | role |
| Role | `role` | Role, UserRole | user |
| Dashboard | `dashboard` | Widget configs | all modules |

### 4.2 Module Communication Patterns

1. **Direct Application Service Call** — Same bounded context or tightly coupled (e.g., payroll → attendance).
2. **Shared Domain Events (Future)** — `src/shared/events/` for async decoupling (payroll finalized → notification).
3. **Read-Only Cross-Module Queries** — Via dedicated query services, never mutable cross-repo access.

### 4.3 Module Lifecycle Hooks

Each module may register:

- `onCompanyCreated` — Seed defaults (leave types, holidays template)
- `onEmployeeCreated` — Create leave balance, portal user link
- `onEmployeeSeparated` — Revoke access, finalize payroll
- `onPayRunFinalized` — Generate payslips, send notifications

Hooks live in `src/modules/{module}/application/hooks/` and are invoked by an orchestrator in `src/shared/orchestration/`.

### 4.4 Feature Flags

Module features gated via `company_settings.enabled_modules` JSON and `src/shared/config/features.ts`. Allows gradual rollout without architecture changes.

---

## 5. Design Principles

### 5.1 SOLID Applied

| Principle | Application |
|-----------|-------------|
| **S** — Single Responsibility | One use case per file; one repository per aggregate root |
| **O** — Open/Closed | Extend via new modules/providers; don't modify core permission engine |
| **L** — Liskov Substitution | Storage, email, cache providers interchangeable |
| **I** — Interface Segregation | Narrow repository interfaces per aggregate |
| **D** — Dependency Inversion | Application depends on domain interfaces; infrastructure implements |

### 5.2 Additional Principles

- **DRY** — Shared validation schemas, pagination, error handling, table components.
- **KISS** — No premature abstraction; extract when third duplication appears.
- **Fail Fast** — Validate at boundary; throw typed `AppError` with codes.
- **Explicit Over Implicit** — No magic globals; tenant context passed explicitly.
- **Audit Everything Sensitive** — Payroll changes, permission grants, salary edits.
- **Soft Delete by Default** — Hard delete only for GDPR purge workflows.
- **Idempotent Operations** — Pay run creation, attendance sync, webhook handlers.
- **Locale-Aware, Country-Ready** — Payroll rules externalized per country/region.

### 5.3 Error Handling Philosophy

```
AppError
├── ValidationError      (400)
├── AuthenticationError  (401)
├── AuthorizationError   (403)
├── NotFoundError        (404)
├── ConflictError        (409)
├── BusinessRuleError    (422)
└── InternalError        (500)
```

User-facing messages are safe; internal details logged, never exposed.

---

## 6. Database Planning

> **Note:** Prisma schema is NOT created in Phase 1. This section defines planning only.

### 6.1 Database Engine

- **Primary:** PostgreSQL 16+
- **Encoding:** UTF-8
- **Timezone:** UTC stored; converted at presentation layer
- **Connection Pooling:** PgBouncer (transaction mode) in production

### 6.2 Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Tables | `snake_case`, plural | `employees`, `leave_requests` |
| Columns | `snake_case` | `first_name`, `company_id` |
| Primary Keys | `{table_singular}_id` as UUID | `employee_id` |
| Foreign Keys | `{referenced_table_singular}_id` | `department_id` |
| Junction Tables | `{table_a}_{table_b}` alphabetical | `role_permissions` |
| Indexes | `idx_{table}_{columns}` | `idx_employees_company_id` |
| Unique Constraints | `uq_{table}_{columns}` | `uq_employees_company_employee_code` |
| Enums (DB) | `snake_case` type names | `leave_status`, `pay_run_status` |

### 6.3 Primary Key Strategy

- **All tables use UUID v7** (time-sortable) as primary key via `id` column.
- External-facing codes (employee code, payslip number) are separate unique business keys.
- UUIDs prevent enumeration attacks and simplify distributed/mobile offline sync.

### 6.4 Foreign Key Strategy

- All FKs enforced at database level with `ON DELETE RESTRICT` by default.
- Cascade only for pure child records (e.g., `payslip_items` → `payslips`).
- Soft-deleted parents remain referentially valid; application layer filters `deleted_at IS NULL`.

### 6.5 Standard Columns (Every Table)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `company_id` | UUID | Tenant isolation (nullable only for global/system tables) |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last modification |
| `created_by` | UUID | User who created (FK → users) |
| `updated_by` | UUID | User who last updated |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp (nullable) |
| `deleted_by` | UUID | User who soft-deleted (nullable) |
| `version` | INTEGER | Optimistic locking (default 1) |

**Exceptions:** Audit logs (append-only, no update/delete), junction tables may omit `version`.

### 6.6 Soft Delete Strategy

- Application queries default: `WHERE deleted_at IS NULL`.
- Base repository enforces soft delete filter on all reads.
- `deleted_at` indexed where table supports soft delete.
- **Restore** supported for admin roles with audit trail.
- **Hard delete** via dedicated GDPR/purge job only, with full audit.

### 6.7 Audit Strategy (Database Level)

- **Row-level audit:** Separate `audit_logs` table (see Section 17).
- **Sensitive tables** also store `previous_values` JSONB on update (salary, permissions).
- **No triggers for business logic** — audit written by application layer for clarity.
- **Immutable audit_logs** — no UPDATE/DELETE permissions on app DB user.

### 6.8 Version Strategy (Optimistic Locking)

- `version` column incremented on every update.
- Update queries: `WHERE id = ? AND version = ?` — conflict returns `ConflictError`.
- Critical for concurrent payroll edits and leave approvals.

### 6.9 Index Strategy

| Pattern | Index Type | Use Case |
|---------|------------|----------|
| `company_id` | B-tree | Every tenant-scoped table |
| `(company_id, deleted_at)` | Partial index | Active records filter |
| `(company_id, employee_id, date)` | B-tree | Attendance, leave queries |
| `(company_id, status, created_at DESC)` | B-tree | List pages with status filter |
| `email`, `employee_code` | Unique partial | Lookup within tenant |
| Full-text | GIN (future) | Employee search, recruitment |
| JSONB fields | GIN | Settings, custom fields |

### 6.10 Partition Strategy (100K+ Scale)

| Table | Partition Key | Strategy |
|-------|---------------|----------|
| `attendance_records` | `company_id` + monthly range on `date` | Range partitions |
| `audit_logs` | Monthly on `created_at` | Range partitions + archival |
| `payslips` | `company_id` + `pay_period_year` | Range partitions |
| `notification_logs` | Monthly on `created_at` | Range partitions |

Implement when single-table row count exceeds ~10M per tenant aggregate.

### 6.11 Migration Strategy

- Prisma Migrate for all schema changes.
- **Backward-compatible migrations only** — add columns nullable first, backfill, then constrain.
- Zero-downtime: expand → deploy → contract pattern.
- Migration naming: `{timestamp}_{description}`.

### 6.12 Read Replicas (Future)

- Reporting and analytics queries routed to read replica via `infrastructure/database/read-client.ts`.
- Write operations always on primary.

---

## 7. Entity Planning

### 7.1 Entity Relationship Overview

```
Company (1) ──→ (N) Branch
Company (1) ──→ (N) Department
Company (1) ──→ (N) Designation
Company (1) ──→ (N) Employee
Branch (1) ──→ (N) Employee
Department (1) ──→ (N) Employee
Designation (1) ──→ (N) Employee

Employee (1) ──→ (N) EmployeeDocument
Employee (1) ──→ (N) AttendanceRecord
Employee (1) ──→ (N) LeaveRequest
Employee (1) ──→ (N) LeaveBalance
Employee (1) ──→ (1) SalaryStructure
Employee (1) ──→ (N) Payslip
Employee (1) ──→ (N) Loan
Employee (1) ──→ (N) Advance

User (1) ──→ (0..1) Employee
User (N) ──→ (N) Role ──→ (N) Permission

PayRun (1) ──→ (N) Payslip
PayRun (1) ──→ (N) PayRunEmployee

Shift (1) ──→ (N) ShiftAssignment
LeaveType (1) ──→ (N) LeaveBalance
```

### 7.2 Core Entities

#### 7.2.1 `companies`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(255) | Legal name |
| slug | VARCHAR(100) | URL-safe, unique |
| logo_url | VARCHAR(500) | Storage reference |
| registration_number | VARCHAR(100) | Business reg |
| tax_id | VARCHAR(100) | GST/PAN/etc. |
| country_code | CHAR(2) | ISO 3166-1 |
| currency_code | CHAR(3) | ISO 4217 |
| timezone | VARCHAR(50) | IANA timezone |
| fiscal_year_start_month | SMALLINT | 1-12 |
| status | ENUM | active, suspended, trial |
| settings | JSONB | Company-level config |

**Indexes:** `uq_companies_slug`, `idx_companies_status`

#### 7.2.2 `branches`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK → companies |
| name | VARCHAR(255) | |
| code | VARCHAR(50) | Unique per company |
| address | JSONB | Structured address |
| latitude | DECIMAL(10,8) | GPS attendance geofence center |
| longitude | DECIMAL(11,8) | |
| geofence_radius_meters | INTEGER | |
| is_head_office | BOOLEAN | |
| status | ENUM | active, inactive |

**Indexes:** `uq_branches_company_code`, `idx_branches_company_id`

#### 7.2.3 `departments`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| branch_id | UUID | FK, nullable (company-wide dept) |
| parent_department_id | UUID | FK self, nullable — hierarchy |
| name | VARCHAR(255) | |
| code | VARCHAR(50) | Unique per company |
| head_employee_id | UUID | FK → employees, nullable |

#### 7.2.4 `designations`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| name | VARCHAR(255) | |
| code | VARCHAR(50) | |
| level | INTEGER | Hierarchy level |
| description | TEXT | |

#### 7.2.5 `employees`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| branch_id | UUID | FK |
| department_id | UUID | FK |
| designation_id | UUID | FK |
| reporting_manager_id | UUID | FK self, nullable |
| user_id | UUID | FK → users, nullable |
| employee_code | VARCHAR(50) | Unique per company |
| first_name | VARCHAR(100) | |
| middle_name | VARCHAR(100) | |
| last_name | VARCHAR(100) | |
| email | VARCHAR(255) | Work email |
| phone | VARCHAR(20) | |
| date_of_birth | DATE | |
| gender | ENUM | |
| date_of_joining | DATE | |
| date_of_separation | DATE | nullable |
| employment_type | ENUM | permanent, contract, intern, daily, hourly |
| employment_status | ENUM | active, on_notice, separated, suspended |
| photo_url | VARCHAR(500) | |
| address | JSONB | |
| bank_details | JSONB | Encrypted at application layer |
| custom_fields | JSONB | Extensible per company |

**Indexes:** `uq_employees_company_code`, `idx_employees_company_status`, `idx_employees_manager`, `idx_employees_department`

#### 7.2.6 `users`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK, nullable for super admin |
| email | VARCHAR(255) | Unique globally |
| password_hash | VARCHAR(255) | bcrypt/argon2 |
| name | VARCHAR(255) | |
| avatar_url | VARCHAR(500) | |
| status | ENUM | active, inactive, locked |
| last_login_at | TIMESTAMPTZ | |
| password_changed_at | TIMESTAMPTZ | |
| failed_login_attempts | SMALLINT | |
| locked_until | TIMESTAMPTZ | |
| two_factor_enabled | BOOLEAN | Future |
| two_factor_secret | VARCHAR(255) | Encrypted, future |

#### 7.2.7 `roles`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK, nullable for system roles |
| name | VARCHAR(100) | |
| slug | VARCHAR(100) | |
| description | TEXT | |
| is_system | BOOLEAN | Cannot delete system roles |
| scope | ENUM | global, company, branch |

#### 7.2.8 `permissions`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| module | VARCHAR(50) | e.g., `employee`, `payroll` |
| action | VARCHAR(50) | e.g., `create`, `read`, `update`, `delete`, `approve` |
| resource | VARCHAR(100) | e.g., `employee.salary` |
| description | TEXT | |

**Format:** `{module}.{resource}.{action}` → `payroll.payslip.approve`

#### 7.2.9 `role_permissions` (Junction)

| Column | Type |
|--------|------|
| role_id | UUID FK |
| permission_id | UUID FK |

#### 7.2.10 `user_roles` (Junction)

| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID | FK |
| role_id | UUID | FK |
| branch_id | UUID | FK, nullable — branch-scoped role |
| assigned_at | TIMESTAMPTZ | |

### 7.3 Attendance Entities

#### 7.3.1 `attendance_records`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| employee_id | UUID | FK |
| date | DATE | Attendance date |
| shift_id | UUID | FK, nullable |
| check_in_at | TIMESTAMPTZ | |
| check_out_at | TIMESTAMPTZ | |
| check_in_method | ENUM | manual, gps, qr, face, biometric |
| check_out_method | ENUM | |
| check_in_location | JSONB | lat, lng, accuracy |
| check_out_location | JSONB | |
| total_work_minutes | INTEGER | Computed |
| overtime_minutes | INTEGER | |
| status | ENUM | present, absent, half_day, late, on_leave, holiday |
| is_regularized | BOOLEAN | |
| regularization_id | UUID | FK, nullable |
| source_device_id | VARCHAR(100) | Mobile/biometric device |
| sync_status | ENUM | synced, pending (offline) |

**Indexes:** `idx_attendance_company_employee_date` (unique), `idx_attendance_company_date_status`

#### 7.3.2 `attendance_policies`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| name | VARCHAR(255) | |
| grace_period_minutes | INTEGER | Late grace |
| half_day_threshold_minutes | INTEGER | |
| overtime_enabled | BOOLEAN | |
| geofence_required | BOOLEAN | |
| face_recognition_enabled | BOOLEAN | |
| qr_enabled | BOOLEAN | |
| rules | JSONB | Flexible rule engine config |

#### 7.3.3 `punch_logs` (Raw punch events)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| employee_id | UUID | FK |
| punched_at | TIMESTAMPTZ | |
| punch_type | ENUM | in, out, break_start, break_end |
| method | ENUM | |
| location | JSONB | |
| device_info | JSONB | |
| photo_url | VARCHAR(500) | Face attendance capture |
| raw_payload | JSONB | Biometric machine raw data |

### 7.4 Leave Entities

#### 7.4.1 `leave_types`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| name | VARCHAR(100) | e.g., Casual, Sick, Earned |
| code | VARCHAR(20) | |
| is_paid | BOOLEAN | |
| is_carry_forward | BOOLEAN | |
| max_carry_forward_days | DECIMAL(5,2) | |
| accrual_type | ENUM | monthly, yearly, none |
| accrual_rate | DECIMAL(5,2) | Days per period |
| requires_attachment | BOOLEAN | |
| min_days_notice | INTEGER | |
| max_consecutive_days | INTEGER | |
| applicable_gender | ENUM | all, male, female |

#### 7.4.2 `leave_balances`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| employee_id | UUID | FK |
| leave_type_id | UUID | FK |
| year | SMALLINT | Fiscal/academic year |
| allocated | DECIMAL(5,2) | |
| used | DECIMAL(5,2) | |
| pending | DECIMAL(5,2) | Approved but future |
| carried_forward | DECIMAL(5,2) | |

**Unique:** `(employee_id, leave_type_id, year)`

#### 7.4.3 `leave_requests`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| employee_id | UUID | FK |
| leave_type_id | UUID | FK |
| start_date | DATE | |
| end_date | DATE | |
| total_days | DECIMAL(5,2) | |
| reason | TEXT | |
| status | ENUM | draft, pending, approved, rejected, cancelled |
| approved_by | UUID | FK → users |
| approved_at | TIMESTAMPTZ | |
| rejection_reason | TEXT | |
| attachment_url | VARCHAR(500) | |

### 7.5 Shift Entities

#### 7.5.1 `shifts`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| name | VARCHAR(100) | |
| start_time | TIME | |
| end_time | TIME | |
| break_duration_minutes | INTEGER | |
| is_overnight | BOOLEAN | Crosses midnight |
| working_days | JSONB | Array of day numbers |

#### 7.5.2 `shift_assignments`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| employee_id | UUID | FK |
| shift_id | UUID | FK |
| effective_from | DATE | |
| effective_to | DATE | nullable |

### 7.6 Payroll Entities

#### 7.6.1 `salary_structures`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| employee_id | UUID | FK |
| effective_from | DATE | |
| effective_to | DATE | nullable |
| pay_frequency | ENUM | monthly, weekly, daily, hourly |
| base_salary | DECIMAL(15,2) | Encrypted optional |
| components | JSONB | Array of {code, name, type, amount, is_taxable} |
| currency_code | CHAR(3) | |

#### 7.6.2 `pay_runs`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| period_start | DATE | |
| period_end | DATE | |
| pay_date | DATE | |
| status | ENUM | draft, processing, review, finalized, paid |
| total_gross | DECIMAL(15,2) | |
| total_deductions | DECIMAL(15,2) | |
| total_net | DECIMAL(15,2) | |
| employee_count | INTEGER | |
| finalized_by | UUID | FK |
| finalized_at | TIMESTAMPTZ | |

#### 7.6.3 `payslips`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| pay_run_id | UUID | FK |
| employee_id | UUID | FK |
| payslip_number | VARCHAR(50) | Unique per company |
| gross_earnings | DECIMAL(15,2) | |
| total_deductions | DECIMAL(15,2) | |
| net_pay | DECIMAL(15,2) | |
| earnings_breakdown | JSONB | |
| deductions_breakdown | JSONB | |
| pdf_url | VARCHAR(500) | Generated payslip |
| status | ENUM | draft, generated, published |

#### 7.6.4 `tax_configs` (Country-specific)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| country_code | CHAR(2) | |
| tax_type | ENUM | pf, esi, pt, tds, custom |
| name | VARCHAR(100) | |
| rules | JSONB | Calculation rules engine |
| effective_from | DATE | |
| effective_to | DATE | |

#### 7.6.5 `loans` / `advances` / `bonuses` / `incentives`

Shared pattern:

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| employee_id | UUID | FK |
| amount | DECIMAL(15,2) | |
| status | ENUM | Module-specific |
| approved_by | UUID | FK |
| recovery_schedule | JSONB | Installments |
| linked_pay_run_id | UUID | FK, nullable |

### 7.7 Supporting Entities

#### 7.7.1 `employee_documents`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| employee_id | UUID | FK |
| document_type_id | UUID | FK |
| title | VARCHAR(255) | |
| file_url | VARCHAR(500) | Storage key |
| file_size_bytes | BIGINT | |
| mime_type | VARCHAR(100) | |
| expiry_date | DATE | nullable |
| verified | BOOLEAN | |
| verified_by | UUID | FK |

#### 7.7.2 `holidays`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| branch_id | UUID | FK, nullable |
| name | VARCHAR(255) | |
| date | DATE | |
| type | ENUM | public, restricted, optional |
| calendar_year | SMALLINT | |

#### 7.7.3 `audit_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| user_id | UUID | FK |
| action | VARCHAR(50) | create, update, delete, login, export |
| entity_type | VARCHAR(100) | Table/entity name |
| entity_id | UUID | |
| old_values | JSONB | |
| new_values | JSONB | |
| ip_address | INET | |
| user_agent | TEXT | |
| metadata | JSONB | Request ID, etc. |

#### 7.7.4 `notifications`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| user_id | UUID | FK |
| channel | ENUM | in_app, email, sms, whatsapp, push |
| type | VARCHAR(100) | leave_approved, payslip_ready |
| title | VARCHAR(255) | |
| body | TEXT | |
| data | JSONB | Deep link params |
| read_at | TIMESTAMPTZ | |
| sent_at | TIMESTAMPTZ | |

#### 7.7.5 `assets`, `recruitment`, `performance`, `training`, `expense_claims`

Each follows the standard column pattern with module-specific fields stored in typed columns + `metadata JSONB` for extensibility. Detailed field specs deferred to module Phase documents but table names are **fixed now**:

- `assets`, `asset_categories`, `asset_assignments`
- `job_postings`, `applicants`, `interviews`, `offers`
- `review_cycles`, `performance_reviews`, `goals`, `kpis`
- `training_programs`, `training_enrollments`, `certificates`
- `expense_claims`, `expense_items`, `expense_policies`

### 7.8 Custom Fields Strategy

Companies may define custom fields per entity type:

**Table:** `custom_field_definitions` (company_id, entity_type, field_key, field_type, options, required, order)

Values stored in entity `custom_fields JSONB` with validation against definitions at application layer.

---

## 8. Permission Architecture

### 8.1 Model: RBAC + ABAC Hybrid

- **RBAC:** Users assigned Roles; Roles grant Permissions.
- **ABAC (Attribute-Based):** Branch scope, department scope, self-only data access layered on top.

### 8.2 Permission Key Format

```
{module}.{resource}.{action}
```

Examples:
- `employee.profile.read`
- `employee.salary.update`
- `payroll.payrun.approve`
- `attendance.record.create`
- `leave.request.approve`
- `report.payroll.export`
- `settings.permission.manage`

### 8.3 System Roles (Seeded, Non-Deletable)

| Role | Scope | Description |
|------|-------|-------------|
| `super_admin` | Global | Platform operator, all companies |
| `company_admin` | Company | Full company access |
| `hr_manager` | Company | HR operations |
| `accounts` | Company | Payroll & finance |
| `branch_manager` | Branch | Branch-scoped management |
| `manager` | Team | Direct reports only |
| `employee` | Self | Self-service portal |
| `guest` | Limited | Read-only dashboards |

Companies may create **unlimited custom roles** combining any permissions.

### 8.4 Permission Check Flow

```
Request → Extract user + roles + branch scope
       → Load permission set (cached in Redis, TTL 5 min)
       → Check required permission key
       → Apply data scope filter (self / team / branch / company)
       → Allow or throw AuthorizationError
```

### 8.5 Data Scope Rules

| Scope | Filter Applied |
|-------|----------------|
| `self` | `employee_id = current_user.employee_id` |
| `team` | `reporting_manager_id = current_user.employee_id` OR recursive CTE |
| `branch` | `branch_id IN user.assigned_branch_ids` |
| `company` | `company_id = current_user.company_id` |
| `global` | No tenant filter (super admin only) |

### 8.6 Permission Engine Location

- **Definition:** `src/shared/permissions/definitions.ts` — all permission keys as constants.
- **Engine:** `src/shared/permissions/engine.ts` — `hasPermission()`, `filterByScope()`.
- **Middleware:** `src/shared/permissions/guards.ts` — `requirePermission('payroll.payrun.approve')`.
- **UI:** `src/shared/permissions/use-permission.ts` — hide/show actions.

### 8.7 Permission Caching

```
Key: permissions:{user_id}:{company_id}
Value: Set of permission strings + scope metadata
Invalidate: On role assignment change, permission update
```

### 8.8 UI Permission Pattern

```typescript
// Buttons/actions wrapped — never rely on UI alone
<PermissionGate permission="employee.salary.update">
  <EditSalaryButton />
</PermissionGate>
```

Server-side checks are **mandatory**; UI gates are UX only.

---

## 9. Authentication Architecture

### 9.1 Solution: Auth.js v5 (NextAuth)

**Why Auth.js:**
- Native Next.js App Router support
- Database sessions (PostgreSQL adapter)
- Credentials + OAuth extensibility
- JWT for mobile API (same session store)
- CSRF protection built-in
- Active maintenance, production proven

### 9.2 Session Strategy

| Context | Strategy |
|---------|----------|
| Web (browser) | Database session cookie (httpOnly, secure, sameSite=lax) |
| Mobile API | Bearer JWT (short-lived access + refresh token rotation) |

### 9.3 Authentication Flow (Web)

```
Login page → Server Action → Validate credentials (Zod + bcrypt verify)
          → Check account status (locked, inactive)
          → Create session in DB + Redis cache
          → Set session cookie
          → Redirect based on role (dashboard vs portal)
          → Audit: login success/failure
```

### 9.4 Password Policy

| Rule | Value |
|------|-------|
| Minimum length | 12 characters |
| Complexity | Upper + lower + number + special |
| Hashing | bcrypt (cost 12) or Argon2id |
| History | Last 5 passwords cannot reuse |
| Expiry | Configurable per company (default: none) |
| Lockout | 5 failed attempts → 30 min lock |

### 9.5 Two-Factor Authentication (Future-Ready)

- `users.two_factor_enabled` + `two_factor_secret` columns reserved.
- Auth.js `callbacks` extended with TOTP verification step.
- Recovery codes stored hashed in separate table `user_recovery_codes`.

### 9.6 Session Management

- Session stored in `sessions` table (Auth.js adapter).
- Redis mirror for fast validation.
- **Concurrent session limit:** Configurable (default: 5).
- **Force logout:** Admin can invalidate all sessions for a user.
- **Idle timeout:** 30 minutes (configurable).
- **Absolute timeout:** 24 hours (configurable).

### 9.7 Middleware (`src/app/middleware.ts`)

```typescript
// Pseudocode — responsibilities:
// 1. Public routes bypass (login, health)
// 2. Validate session
// 3. Inject headers: x-user-id, x-company-id, x-request-id
// 4. Rate limit auth endpoints
// 5. Redirect unauthenticated → login
// 6. Redirect employee role → portal routes
```

### 9.8 Mobile API Auth (Future)

```
POST /api/v1/auth/login → { access_token, refresh_token, expires_in }
POST /api/v1/auth/refresh → new access_token
Authorization: Bearer {access_token}
```

Same `users` table; tokens validated against session store.

---

## 10. UI Architecture

### 10.1 Design Language

| Attribute | Specification |
|-----------|---------------|
| Tone | Professional, premium, enterprise, minimal |
| Corners | `rounded-lg` (8px) cards, `rounded-md` inputs |
| Spacing | 4px grid — generous whitespace |
| Typography | Inter (UI), JetBrains Mono (codes/numbers) |
| Shadows | Subtle `shadow-sm` on cards, `shadow-md` on modals |
| Motion | Minimal — 150ms transitions, respect `prefers-reduced-motion` |

### 10.2 Color System (Green Primary)

```css
/* Light Mode */
--primary: oklch(0.55 0.18 145);        /* Green */
--primary-foreground: oklch(0.99 0 0);  /* White */
--background: oklch(0.99 0 0);          /* White */
--foreground: oklch(0.15 0 0);          /* Near black */
--muted: oklch(0.96 0 0);               /* Light gray */
--accent: oklch(0.55 0.18 145);         /* Green accent */

/* Dark Mode */
--background: oklch(0.13 0 0);          /* Near black */
--foreground: oklch(0.95 0 0);          /* Off white */
--card: oklch(0.17 0 0);
--primary: oklch(0.65 0.18 145);        /* Lighter green for dark */
```

Accent colors (red for destructive, amber for warning, blue for info) used sparingly.

### 10.3 Layout Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Top Bar: Logo | Company Switcher | Search | Notif | User │
├──────────┬──────────────────────────────────────────────┤
│          │  Breadcrumbs                                  │
│ Sidebar  ├──────────────────────────────────────────────┤
│ (collaps-│                                               │
│  ible)   │  Page Content (cards, tables, forms)          │
│          │                                               │
│          │                                               │
└──────────┴──────────────────────────────────────────────┘
```

- **Sidebar:** Module navigation, permission-filtered menu items.
- **Portal layout:** Simplified sidebar for employees.
- **Responsive:** Sidebar → drawer on tablet/mobile.

### 10.4 Component Hierarchy

```
Page (Server Component)
  └── PageHeader (title, actions)
  └── ContentCard(s)
        └── DataTable / Form / Chart
              └── ui/* primitives (shadcn)
```

### 10.5 Server vs Client Components

| Use Server Component | Use Client Component |
|---------------------|---------------------|
| Page layouts, static content | Interactive forms |
| Data fetching lists (initial) | Data tables (sort, filter, select) |
| Permission-gated static UI | Modals, dropdowns, toasts |
| Dashboard stat cards | Charts (Recharts) |
| Breadcrumbs | Theme toggle |

**Rule:** Push `"use client"` boundary as deep as possible.

### 10.6 Form Pattern

- React Hook Form + Zod resolver.
- Shared form components in `src/components/forms/`.
- Server Actions for submission.
- Optimistic UI only where safe (non-financial).

### 10.7 Table Pattern

- TanStack Table v8 wrapped in `src/components/data-table/`.
- Server-side pagination, sorting, filtering.
- Column visibility persistence (localStorage).
- Virtualization for 1000+ rows (`@tanstack/react-virtual`).
- Bulk actions with permission checks.

### 10.8 Theme Implementation

- `next-themes` for dark/light toggle.
- CSS variables in `src/styles/theme.css`.
- Tailwind v4 `@theme` directive for token mapping.
- System preference detection default.

### 10.9 Accessibility

- WCAG 2.1 AA target.
- Keyboard navigation for all interactive elements.
- ARIA labels on icon-only buttons.
- Focus visible rings.
- Color contrast ratio ≥ 4.5:1.

### 10.10 Responsive Breakpoints

| Name | Width | Layout |
|------|-------|--------|
| mobile | < 640px | Single column, bottom nav option |
| tablet | 640–1024px | Collapsed sidebar drawer |
| laptop | 1024–1440px | Full sidebar |
| desktop | 1440–1920px | Full layout |
| wide | > 1920px | Max-width container centered |

---

## 11. API Architecture

### 11.1 API Surfaces

| Surface | Path | Consumer |
|---------|------|----------|
| Server Actions | Colocated in modules | Web app forms/mutations |
| Internal Route Handlers | `/api/internal/*` | Webhooks, health, exports |
| Public Mobile API | `/api/v1/*` | Mobile apps (future) |
| Webhooks (outbound) | N/A | External systems |

### 11.2 REST Conventions (Mobile API)

```
GET    /api/v1/employees              # List (paginated)
GET    /api/v1/employees/:id          # Get one
POST   /api/v1/employees              # Create
PATCH  /api/v1/employees/:id          # Partial update
DELETE /api/v1/employees/:id          # Soft delete

GET    /api/v1/attendance/punch       # Mobile punch
POST   /api/v1/leave/requests         # Submit leave
GET    /api/v1/payslips               # Employee payslips
```

### 11.3 Response Envelope

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "timestamp": "ISO8601"
  }
}
```

**Paginated Success:**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 25,
      "total_items": 1250,
      "total_pages": 50
    },
    "request_id": "uuid"
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  },
  "meta": {
    "request_id": "uuid"
  }
}
```

### 11.4 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 204 | Deleted (soft delete) |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Unauthorized |
| 404 | Not found |
| 409 | Conflict (version mismatch, duplicate) |
| 422 | Business rule violation |
| 429 | Rate limited |
| 500 | Internal error |

### 11.5 Pagination

Query params: `?page=1&page_size=25` (default 25, max 100)

Cursor-based pagination for mobile sync endpoints: `?cursor=uuid&limit=50`

### 11.6 Filtering & Sorting

```
?filter[status]=active
&filter[department_id]=uuid
&sort=-created_at,name
&search=john
```

Filter keys validated against allowlist per endpoint.

### 11.7 API Versioning

- URL prefix: `/api/v1/`
- Breaking changes → `/api/v2/` with 12-month deprecation window.
- Non-breaking additions allowed in same version.

### 11.8 Server Actions Conventions

```typescript
// Pattern: thin action → use case → response
'use server'

export async function createEmployee(input: CreateEmployeeInput) {
  const session = await requireAuth()
  await requirePermission('employee.profile.create')
  const validated = createEmployeeSchema.parse(input)
  const result = await createEmployeeUseCase.execute(validated, session)
  revalidateTag(`employees:${session.companyId}`)
  return { success: true, data: result }
}
```

### 11.9 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Login | 10/min per IP |
| API general | 100/min per user |
| Export/Report | 5/min per user |
| Mobile punch | 30/min per user |

Implemented via Redis sliding window in middleware.

---

## 12. Service Layer Architecture

### 12.1 Use Case Pattern

Each business operation is one use case class/function:

```
src/modules/employee/application/use-cases/create-employee.use-case.ts
src/modules/payroll/application/use-cases/finalize-pay-run.use-case.ts
```

**Structure:**
```typescript
interface UseCase<TInput, TOutput> {
  execute(input: TInput, context: RequestContext): Promise<TOutput>
}
```

### 12.2 Request Context

Passed to every use case:

```typescript
interface RequestContext {
  userId: string
  companyId: string
  employeeId?: string
  roles: string[]
  permissions: string[]
  branchIds: string[]
  requestId: string
  ipAddress: string
}
```

### 12.3 Repository Pattern

**Interface (domain):**
```typescript
// src/modules/employee/domain/repositories/employee.repository.ts
interface EmployeeRepository {
  findById(id: string, companyId: string): Promise<Employee | null>
  findMany(params: EmployeeQueryParams): Promise<PaginatedResult<Employee>>
  create(data: CreateEmployeeData): Promise<Employee>
  update(id: string, data: UpdateEmployeeData, version: number): Promise<Employee>
  softDelete(id: string, deletedBy: string): Promise<void>
}
```

**Implementation (infrastructure):**
```typescript
// src/modules/employee/infrastructure/repositories/prisma-employee.repository.ts
class PrismaEmployeeRepository extends BaseRepository implements EmployeeRepository
```

### 12.4 Base Repository

`src/infrastructure/database/base-repository.ts` provides:
- Automatic `company_id` filtering
- Soft delete filtering
- Audit field population (`created_by`, `updated_by`)
- Transaction helper

### 12.5 Domain Services

Pure business logic that doesn't belong to a single entity:

- `PayrollCalculationService` — compute gross, deductions, net
- `LeaveAccrualService` — monthly accrual calculations
- `AttendanceCalculationService` — work hours, overtime
- `TaxCalculationService` — country-specific tax rules (strategy pattern)

Location: `src/modules/{module}/domain/services/`

### 12.6 Application Service Orchestration

Complex workflows spanning modules:

```
FinalizePayRunUseCase
  → Fetch attendance summary (attendance module)
  → Fetch approved leaves (leave module)
  → Fetch salary structures (payroll module)
  → Calculate via PayrollCalculationService
  → Create payslips
  → Emit PayRunFinalized event
  → Trigger notification
```

### 12.7 Dependency Injection

Manual constructor injection (no heavy DI framework):

```typescript
// Wired in src/lib/container.ts or per use case factory
const employeeRepo = new PrismaEmployeeRepository(prisma)
const createEmployee = new CreateEmployeeUseCase(employeeRepo, auditLogger)
```

Future: consider `tsyringe` if module count makes manual wiring unwieldy.

### 12.8 Transaction Boundaries

- Use case level defines transaction scope.
- `prisma.$transaction()` for multi-table operations.
- Payroll finalization: single transaction for pay_run + all payslips.

---

## 13. Shared Components Strategy

### 13.1 Component Categories

| Category | Location | Examples |
|----------|----------|----------|
| Primitives | `components/ui/` | Button, Input, Dialog, Select (shadcn) |
| Layout | `components/layout/` | AppShell, Sidebar, Header, PageHeader |
| Data Display | `components/data-table/` | DataTable, Pagination, ColumnHeader |
| Forms | `components/forms/` | FormField, DatePicker, CurrencyInput, EmployeeSelect |
| Feedback | `components/feedback/` | Toast, Alert, EmptyState, LoadingSkeleton |
| Charts | `components/charts/` | BarChart, LineChart, DonutChart wrappers |
| Files | `components/files/` | FileUpload, DocumentViewer, AvatarUpload |
| Permissions | `components/permissions/` | PermissionGate, RoleBadge |

### 13.2 Component Rules

1. **No business logic** in shared components — accept data via props.
2. **Compound components** for complex UI (DataTable.Header, DataTable.Body).
3. **Variants via CVA** (class-variance-authority) for consistent styling.
4. **forwardRef** on all form-compatible components.
5. **Storybook** (future) for component documentation.

### 13.3 Module-Specific Components

Live in `src/modules/{module}/components/` when:
- Component used only within that module.
- Component encodes module-specific business display logic.

Promote to shared when used by 2+ modules.

### 13.4 Hook Strategy

| Hook | Location | Purpose |
|------|----------|---------|
| `usePermission` | `shared/permissions/` | Check permission in client |
| `usePagination` | `shared/hooks/` | URL-synced pagination state |
| `useDebounce` | `shared/hooks/` | Search input debounce |
| `useMediaQuery` | `shared/hooks/` | Responsive breakpoints |
| Module hooks | `modules/*/hooks/` | Module-specific data fetching |

Data fetching: **TanStack Query** hooks colocated with modules.

---

## 14. Storage Strategy

### 14.1 Abstraction Interface

```typescript
// src/infrastructure/storage/storage-provider.interface.ts
interface StorageProvider {
  upload(key: string, file: Buffer, options: UploadOptions): Promise<StorageResult>
  download(key: string): Promise<Buffer>
  getSignedUrl(key: string, expiresIn: number): Promise<string>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}
```

### 14.2 Implementations

| Provider | Class | Environment |
|----------|-------|-------------|
| Local | `LocalStorageProvider` | Development |
| AWS S3 | `S3StorageProvider` | Production option |
| Cloudflare R2 | `R2StorageProvider` | Production option |
| MinIO | `MinIOStorageProvider` | Self-hosted option |

Selected via `STORAGE_PROVIDER` env variable.

### 14.3 Key Naming Convention

```
{company_id}/{category}/{entity_id}/{filename}

Examples:
  abc-123/employees/def-456/photo.jpg
  abc-123/documents/def-456/aadhar.pdf
  abc-123/payslips/2026-01/payslip-001.pdf
  abc-123/company/logo.png
  abc-123/reports/payroll-jan-2026.xlsx
```

### 14.4 File Categories

| Category | Max Size | Allowed Types |
|----------|----------|---------------|
| employee_photo | 2 MB | jpg, png, webp |
| document | 10 MB | pdf, jpg, png, doc, docx |
| certificate | 5 MB | pdf, jpg, png |
| payslip | 2 MB | pdf |
| report | 50 MB | pdf, xlsx, csv |
| company_logo | 1 MB | png, svg, webp |
| attendance_capture | 3 MB | jpg, png |

### 14.5 Security

- All uploads validated: MIME type (magic bytes), size, extension.
- Virus scan hook (future ClamAV integration).
- Signed URLs for download (15 min expiry default).
- No public buckets — all access via signed URLs or proxy route.
- Encrypt sensitive documents at rest (S3 SSE or application-level AES-256).

### 14.6 Upload Flow

```
Client → Server Action (validate permission + file)
       → StorageProvider.upload()
       → Save metadata in DB (file_url = storage key, not full URL)
       → Return signed URL for immediate preview
```

---

## 15. Validation Strategy

### 15.1 Single Source of Truth: Zod

All validation schemas live in `src/shared/validation/` (shared) or `src/modules/*/validation/` (module-specific).

Same schema used for:
- Server Action input validation
- API Route Handler body validation
- React Hook Form client validation (via `@hookform/resolvers/zod`)
- Type inference (`z.infer<typeof schema>`)

### 15.2 Schema Organization

```
src/shared/validation/
  common.schema.ts       # UUID, email, phone, date, pagination
  address.schema.ts
  money.schema.ts

src/modules/employee/validation/
  create-employee.schema.ts
  update-employee.schema.ts
  employee-query.schema.ts
```

### 15.3 Validation Layers

| Layer | What | Where |
|-------|------|-------|
| Client | UX feedback, early rejection | React Hook Form + Zod |
| Server Action | Input sanitization | First line of action |
| Use Case | Business rule validation | Domain logic |
| Database | Constraints, FKs, unique | Prisma schema |

**Never trust client validation alone.**

### 15.4 Common Validators

```typescript
// Shared primitives
const uuidSchema = z.string().uuid()
const emailSchema = z.string().email().max(255)
const phoneSchema = z.string().regex(/^\+?[1-9]\d{6,14}$/)
const dateSchema = z.coerce.date()
const moneySchema = z.number().positive().multipleOf(0.01)
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
})
```

### 15.5 Sanitization

- Trim strings on all text inputs.
- Normalize email to lowercase.
- Strip HTML from text fields (XSS prevention).
- Use `z.coerce` for query params and form data type conversion.

---

## 16. Logging Strategy

### 16.1 Log Categories

| Category | Purpose | Destination |
|----------|---------|-------------|
| **Application** | General app flow, info | stdout (JSON) |
| **Error** | Unhandled exceptions, stack traces | stdout + (future) Sentry |
| **Activity** | User actions (non-sensitive) | DB `activity_logs` |
| **Audit** | Sensitive data changes | DB `audit_logs` (immutable) |
| **Security** | Auth failures, permission denials | DB `security_logs` + alert |
| **Performance** | Slow queries, request timing | stdout |

### 16.2 Structured Log Format

```json
{
  "level": "error",
  "timestamp": "2026-07-23T15:30:00.000Z",
  "request_id": "uuid",
  "user_id": "uuid",
  "company_id": "uuid",
  "module": "payroll",
  "action": "finalize_pay_run",
  "message": "Pay run finalization failed",
  "error": { "code": "...", "stack": "..." },
  "duration_ms": 1234
}
```

### 16.3 Logger Implementation

- **Library:** `pino` (structured, fast, JSON).
- **Location:** `src/infrastructure/logging/logger.ts`
- **Child loggers:** `logger.child({ module: 'payroll', requestId })`

### 16.4 Log Levels

| Level | Usage |
|-------|-------|
| `fatal` | System cannot continue |
| `error` | Operation failed, needs attention |
| `warn` | Degraded but functional |
| `info` | Normal operations (login, pay run created) |
| `debug` | Development only |
| `trace` | Verbose debugging (disabled in prod) |

### 16.5 Request ID

Every request assigned `x-request-id` (UUID v7) at middleware. Propagated through all logs and audit entries.

### 16.6 Sensitive Data

**Never log:** passwords, tokens, bank details, salary amounts (log entity IDs only), full PII.

---

## 17. Audit Strategy

### 17.1 What Gets Audited

| Category | Actions |
|----------|---------|
| Authentication | login, logout, failed_login, password_change, session_revoke |
| Authorization | permission_grant, permission_revoke, role_assignment |
| Employee | create, update, delete, salary_change, status_change |
| Payroll | pay_run_create, pay_run_finalize, payslip_generate, salary_structure_change |
| Leave | request, approve, reject, cancel, balance_adjustment |
| Attendance | manual_override, regularization_approve |
| Settings | company_settings_change, policy_change |
| Data Export | report_export, bulk_download |
| Admin | user_create, user_deactivate, role_create |

### 17.2 Audit Record Structure

```typescript
interface AuditLog {
  id: string
  companyId: string
  userId: string
  action: string                    // 'employee.salary.update'
  entityType: string                // 'employees'
  entityId: string
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  ipAddress: string
  userAgent: string
  requestId: string
  metadata: Record<string, unknown>
  createdAt: Date
}
```

### 17.3 Audit Service

```typescript
// src/modules/audit/application/audit.service.ts
class AuditService {
  log(entry: CreateAuditLogInput): Promise<void>
  query(filters: AuditQueryFilters): Promise<PaginatedResult<AuditLog>>
}
```

- Called from use cases after successful mutations.
- Async write (non-blocking) but within same request lifecycle.
- Failed audit write → log error + alert (never silently skip).

### 17.4 Audit UI

- Admin/HR role: `/dashboard/audit` — searchable, filterable audit trail.
- Entity detail pages: "History" tab showing changes to that record.
- Export audit logs to CSV/PDF for compliance.

### 17.5 Retention

| Log Type | Retention |
|----------|-----------|
| Audit logs | 7 years (configurable, compliance default) |
| Security logs | 2 years |
| Activity logs | 1 year |
| Error logs | 90 days |

Archival to cold storage (S3 Glacier) after retention period via scheduled job.

---

## 18. Security Strategy

### 18.1 Security Layers

```
┌─────────────────────────────────────────┐
│  WAF / Nginx (SSL, headers, rate limit) │
├─────────────────────────────────────────┤
│  Middleware (auth, CSRF, tenant context)│
├─────────────────────────────────────────┤
│  Application (permissions, validation)  │
├─────────────────────────────────────────┤
│  Data (encryption, parameterized queries)│
├─────────────────────────────────────────┤
│  Infrastructure (network, secrets)    │
└─────────────────────────────────────────┘
```

### 18.2 OWASP Top 10 Mitigations

| Threat | Mitigation |
|--------|------------|
| **Injection** | Prisma parameterized queries; Zod validation; no raw SQL without review |
| **Broken Auth** | Auth.js sessions; bcrypt/Argon2; lockout policy; session invalidation |
| **Sensitive Data** | TLS everywhere; encrypt bank details at app layer; no PII in logs |
| **XXE** | No XML parsing |
| **Broken Access Control** | RBAC engine; server-side permission checks on every action |
| **Security Misconfig** | Security headers; env validation; no default credentials |
| **XSS** | React auto-escape; CSP headers; sanitize rich text (future) |
| **Insecure Deserialization** | JSON only; Zod parse all inputs |
| **Known Vulnerabilities** | Dependabot; npm audit in CI |
| **Insufficient Logging** | Audit + security logs; failed auth monitoring |

### 18.3 CSRF Protection

- Auth.js built-in CSRF tokens for Server Actions.
- SameSite=lax cookies.
- Origin header validation on mutations.

### 18.4 Security Headers (Nginx + Next.js)

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Content-Security-Policy: default-src 'self'; ...
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

### 18.5 Encryption

| Data | Method |
|------|--------|
| Passwords | bcrypt (cost 12) |
| Bank details | AES-256-GCM (app-level, key in env/KMS) |
| 2FA secrets | AES-256-GCM |
| Data at rest (DB) | PostgreSQL TDE or disk encryption |
| Data in transit | TLS 1.3 |
| Backups | Encrypted before storage |

### 18.6 Secrets Management

- `.env` for development only.
- Production: environment variables via Docker secrets or vault.
- Never commit secrets; `.env.example` with placeholder keys.
- Rotate keys quarterly.

### 18.7 Input Validation

- All inputs validated with Zod at server boundary.
- File uploads: type, size, content validation.
- Query params: allowlist filtering keys.

### 18.8 API Security

- Rate limiting (Redis).
- JWT expiry: access 15 min, refresh 7 days.
- CORS: strict origin allowlist for mobile API.
- Request size limits: 10MB default, 50MB for file uploads.

---

## 19. Performance Strategy

### 19.1 Scale Targets

| Metric | Target |
|--------|--------|
| Employees per company | 100,000+ |
| Concurrent users | 5,000+ |
| Page load (LCP) | < 2.5s |
| API response (p95) | < 500ms |
| Pay run (10K employees) | < 5 minutes |
| Attendance punch | < 200ms |

### 19.2 Server Components First

- Default to Server Components for data fetching.
- Eliminate client-side waterfalls.
- Stream with Suspense boundaries.

### 19.3 Caching Strategy

| Layer | Tool | TTL | Invalidation |
|-------|------|-----|--------------|
| CDN | Nginx static cache | 1 year (hashed assets) | Build deploy |
| Next.js Data Cache | `unstable_cache` + tags | Varies | `revalidateTag()` |
| Redis | Application cache | 5–60 min | Event-based invalidation |
| Browser | TanStack Query | Stale-while-revalidate | Mutation invalidation |

**Cache tags pattern:**
```
employees:{companyId}
employee:{employeeId}
payroll:{companyId}:{period}
permissions:{userId}
dashboard:{companyId}:{widget}
```

### 19.4 Database Performance

- Connection pooling (PgBouncer).
- All list queries paginated (never unbounded SELECT).
- Covering indexes for common list queries.
- EXPLAIN ANALYZE review for queries > 100ms.
- Read replica for reports/analytics.
- Table partitioning for high-volume tables (see Section 6.10).

### 19.5 Frontend Performance

- Code splitting via dynamic imports.
- Virtualized tables for large datasets.
- Image optimization via Next.js `<Image>`.
- Font subsetting (Inter variable).
- Lazy load charts and heavy modules.
- Prefetch on sidebar hover (Next.js Link).

### 19.6 Payroll Batch Processing

Large pay runs processed asynchronously:
1. Create pay_run in `draft` status.
2. Queue batch job (future: BullMQ worker).
3. Process employees in chunks of 500.
4. Update progress in Redis.
5. UI polls progress or uses SSE.
6. Finalize when complete.

### 19.7 Background Jobs (Future)

| Job | Priority | Schedule |
|-----|----------|----------|
| Leave accrual | Normal | Monthly cron |
| Pay run processing | High | On demand |
| Report generation | Normal | On demand |
| Notification dispatch | Normal | Real-time queue |
| Audit log archival | Low | Weekly |
| Database backup | High | Daily |

---

## 20. Deployment Strategy

### 20.1 Environments

| Environment | Purpose | URL Pattern |
|-------------|---------|-------------|
| development | Local dev | localhost:3000 |
| staging | QA / UAT | staging.atheron.app |
| production | Live | app.atheron.app |

### 20.2 Docker Architecture

```yaml
# docker-compose.yml (production)
services:
  app:
    build: .
    replicas: 2
    depends_on: [postgres, redis]
  postgres:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
  nginx:
    image: nginx:alpine
    ports: ["443:443"]
    depends_on: [app]
```

### 20.3 Dockerfile (Multi-stage)

```
Stage 1: deps     → npm ci
Stage 2: build    → next build
Stage 3: runtime  → node:20-alpine, standalone output
```

Next.js `output: 'standalone'` for minimal container size.

### 20.4 Server Requirements (Production)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk | 50 GB SSD | 100+ GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

### 20.5 Nginx Configuration

- SSL termination (Let's Encrypt / Certbot).
- Reverse proxy to Next.js on port 3000.
- Static file caching.
- Gzip compression.
- Rate limiting at edge.
- WebSocket support (future real-time notifications).

### 20.6 PM2 Process Management

```javascript
// ecosystem.config.js
{
  apps: [{
    name: 'atheron-hrms',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G'
  }]
}
```

### 20.7 CI/CD Pipeline

```
Push to main
  → GitHub Actions
    → Lint (ESLint)
    → Type check (tsc --noEmit)
    → Unit tests (Vitest)
    → Build (next build)
    → Integration tests
    → Docker build & push
    → Deploy to staging (auto)
    → Deploy to production (manual approval)
```

### 20.8 Database Backups

| Type | Frequency | Retention |
|------|-----------|-----------|
| Full backup | Daily 2 AM UTC | 30 days |
| WAL archiving | Continuous | 7 days |
| Backup verification | Weekly | — |

Tool: `pg_dump` + cron, or `pgBackRest` for larger deployments. Backups encrypted and stored offsite (S3).

### 20.9 Monitoring (Future)

- **Uptime:** Health check endpoint `/api/health`
- **APM:** OpenTelemetry → Grafana
- **Errors:** Sentry
- **Logs:** Centralized via Docker log driver → Loki/CloudWatch
- **Alerts:** PagerDuty/Slack for error rate spikes, disk usage, backup failures

### 20.10 Zero-Downtime Deployment

1. Build new Docker image.
2. Run database migrations (backward compatible).
3. Rolling update: start new containers, drain old.
4. Health check passes → remove old containers.

---

## 21. Coding Standards

### 21.1 TypeScript

- **Strict mode** enabled (`strict: true` in tsconfig).
- **No `any`** — use `unknown` and narrow, or define proper types.
- **No `@ts-ignore`** — fix the type issue or use `@ts-expect-error` with comment.
- Prefer `interface` for object shapes; `type` for unions/intersections.
- Use `const` assertions and `as const` for literal types.
- Enums: prefer `as const` objects over TypeScript enums.

### 21.2 File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase.tsx | `EmployeeTable.tsx` |
| Hooks | kebab-case with use- prefix | `use-employees.ts` |
| Use cases | kebab-case with .use-case suffix | `create-employee.use-case.ts` |
| Schemas | kebab-case with .schema suffix | `create-employee.schema.ts` |
| Utils | kebab-case | `format-currency.ts` |
| Types | kebab-case with .types suffix | `employee.types.ts` |
| Tests | same name + .test suffix | `create-employee.use-case.test.ts` |

### 21.3 Code Organization

- One export per file for use cases and repositories.
- Barrel exports (`index.ts`) at module level only — not deep nesting.
- Max file length: ~300 lines — split if exceeded.
- Max function length: ~50 lines — extract helpers.

### 21.4 Import Order

```typescript
// 1. External packages
import { z } from 'zod'

// 2. Internal absolute imports (@/)
import { requirePermission } from '@/shared/permissions/guards'

// 3. Relative imports
import { EmployeeRepository } from '../domain/repositories/employee.repository'

// 4. Types (if not inline)
import type { CreateEmployeeInput } from '../dto/create-employee.dto'
```

### 21.5 Error Handling

```typescript
// Always use AppError hierarchy
throw new NotFoundError('Employee', employeeId)
throw new BusinessRuleError('Cannot approve leave: insufficient balance')
throw new AuthorizationError('payroll.payslip.approve')

// Catch at action/handler boundary
try {
  return await useCase.execute(input, context)
} catch (error) {
  if (error instanceof AppError) return error.toResponse()
  logger.error(error, 'Unhandled error in createEmployee')
  throw new InternalError()
}
```

### 21.6 Comments

- JSDoc on public APIs and complex domain logic.
- No commented-out code in commits.
- TODO comments must include ticket/reference: `// TODO(ATH-123): ...`

### 21.7 Git Conventions

- **Branch naming:** `feature/ATH-123-employee-import`, `fix/ATH-456-payroll-rounding`
- **Commit messages:** Conventional Commits — `feat(employee): add bulk import`, `fix(payroll): correct PF calculation`
- **PR size:** Max ~400 lines changed; split larger work.

---

## 22. Naming Standards

### 22.1 Database

| Element | Convention | Example |
|---------|------------|---------|
| Tables | snake_case, plural | `leave_requests` |
| Columns | snake_case | `first_name`, `created_at` |
| PK column | `id` (UUID) | |
| FK column | `{entity}_id` | `employee_id` |
| Boolean columns | `is_` or `has_` prefix | `is_active`, `has_attachment` |
| Timestamp columns | `_at` suffix | `created_at`, `approved_at` |
| Status columns | `status` | ENUM type |
| Indexes | `idx_{table}_{columns}` | `idx_employees_company_id` |
| Constraints | `uq_`, `fk_`, `chk_` | `uq_employees_company_code` |

### 22.2 Application Code

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `employeeCount` |
| Constants | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |
| Functions | camelCase, verb prefix | `createEmployee`, `calculateTax` |
| Classes | PascalCase | `CreateEmployeeUseCase` |
| Interfaces | PascalCase (no I prefix) | `EmployeeRepository` |
| Types | PascalCase | `CreateEmployeeInput` |
| Enums (const) | PascalCase keys | `EmploymentStatus.Active` |
| Permission keys | dot-separated lowercase | `employee.salary.update` |
| Cache keys | colon-separated | `employees:company-id` |
| Storage keys | slash-separated | `company-id/payslips/...` |
| API routes | kebab-case | `/api/v1/leave-requests` |
| URL paths | kebab-case | `/dashboard/leave-requests` |
| Env variables | UPPER_SNAKE_CASE | `DATABASE_URL`, `STORAGE_PROVIDER` |

### 22.3 UI Text

- Title case for page titles and headings.
- Sentence case for labels, buttons, descriptions.
- Consistent terminology: "Employee" not "Staff" or "Worker" (configurable display labels in future).

---

## 23. Future Expansion Strategy

### 23.1 Extension Principles

1. **Add, don't replace** — new modules plug into existing patterns.
2. **New tables, not altered contracts** — additive schema migrations.
3. **Feature flags** — gradual rollout without deployment risk.
4. **API versioning** — v2 for breaking changes only.
5. **Event-driven decoupling** — modules communicate via domain events when loose coupling needed.

### 23.2 Planned Expansion Areas

| Area | Architecture Preparation |
|------|-------------------------|
| **Mobile Apps** | `/api/v1/*` REST API; JWT auth; offline sync via cursor pagination |
| **AI HR Assistant** | `src/modules/ai/` — LLM provider abstraction; context from employee/payroll data |
| **AI Payroll Checking** | Anomaly detection service; hooks into pay run finalization |
| **AI Attendance Analysis** | Pattern analysis on `attendance_records`; scheduled job |
| **AI Leave Prediction** | ML model on historical leave data; read-only recommendations |
| **Biometric Integration** | `punch_logs.raw_payload` JSONB; webhook endpoint for device sync |
| **Multi-Country Payroll** | `tax_configs.rules` JSONB rule engine; strategy pattern per country |
| **WhatsApp Notifications** | `notification` module channel enum; provider abstraction like email |
| **Workflow Engine** | Approval chains for leave, expenses; state machine pattern |
| **Custom Reports Builder** | `report_definitions` table; query builder UI |
| **SSO / SAML** | Auth.js provider extension; no auth architecture change |
| **Multi-Language (i18n)** | `next-intl`; translation keys from Phase 3+ |
| **Webhooks (Outbound)** | `webhook_subscriptions` table; event dispatcher in queue |
| **ERP Integration** | `/api/v1/` + webhook; adapter pattern in `infrastructure/integrations/` |

### 23.3 AI Module Architecture (Future)

```
src/modules/ai/
├── domain/
│   ├── providers/           # LLM provider interface (OpenAI, Anthropic, local)
│   └── context-builders/    # Build prompts from HR data
├── application/
│   ├── use-cases/
│   │   ├── hr-assistant.use-case.ts
│   │   ├── payroll-anomaly-check.use-case.ts
│   │   └── attendance-analysis.use-case.ts
│   └── actions/
├── infrastructure/
│   └── providers/           # OpenAI, Anthropic implementations
└── components/
    └── AiChatPanel.tsx
```

AI modules **read** from other modules via application services — never direct DB access.

### 23.4 Mobile API Readiness

All mobile-required endpoints will use:
- Same use cases as web (no duplicate business logic).
- JWT authentication.
- Consistent response envelope.
- Cursor-based pagination for sync.
- Optimistic concurrency via `version` field.
- File upload via presigned URLs.

---

## 24. Development Roadmap

### Phase 1 — Foundation (Current)

- [x] Architecture Document (this document)
- [ ] Project scaffolding (Next.js 15, Tailwind v4, shadcn/ui)
- [ ] Auth.js setup with login/logout
- [ ] Database schema (Prisma) — core entities
- [ ] RBAC permission engine
- [ ] Base UI shell (sidebar, header, theme)
- [ ] Audit logging infrastructure

### Phase 2 — Core HR

- [ ] Company, Branch, Department, Designation CRUD
- [ ] Employee management (CRUD, profile, documents)
- [ ] User management & role assignment
- [ ] Settings module
- [ ] Employee portal (basic profile view)

### Phase 3 — Attendance & Leave

- [ ] Shift management & rosters
- [ ] Manual attendance entry
- [ ] GPS attendance (mobile-ready API)
- [ ] QR attendance
- [ ] Leave types, balances, requests, approvals
- [ ] Holiday calendar

### Phase 4 — Payroll

- [ ] Salary structure management
- [ ] Pay run creation & processing
- [ ] Payslip generation (PDF)
- [ ] PF, ESI, PT, TDS (India default)
- [ ] Loans, advances, bonus, incentives
- [ ] Payroll reports

### Phase 5 — Advanced Modules

- [ ] Recruitment (job postings, applicants, interviews)
- [ ] Performance management (reviews, goals, KPIs)
- [ ] Training & certificates
- [ ] Asset management
- [ ] Expense claims

### Phase 6 — Analytics & Reporting

- [ ] Dashboard widgets
- [ ] Report builder
- [ ] PDF/Excel exports
- [ ] Analytics charts

### Phase 7 — Mobile & Integrations

- [ ] Mobile API (/api/v1/)
- [ ] Push notifications
- [ ] Email notifications
- [ ] Biometric device integration
- [ ] Face attendance

### Phase 8 — AI & Advanced

- [ ] AI HR Assistant
- [ ] AI payroll anomaly detection
- [ ] Two-factor authentication
- [ ] SSO/SAML
- [ ] Multi-country payroll rules
- [ ] WhatsApp/SMS notifications

---

## 25. Risks

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| 1 | Payroll calculation errors | Critical — financial/legal | Medium | Extensive test suite; manual review step; audit trail; staged rollout |
| 2 | Performance degradation at scale | High — unusable system | Medium | Partitioning strategy; caching; load testing from Phase 4 |
| 3 | Permission bypass vulnerability | Critical — data breach | Low | Server-side checks mandatory; security review per module; penetration testing |
| 4 | Schema migration failures in production | High — downtime | Low | Backward-compatible migrations only; staging verification; rollback plan |
| 5 | Scope creep delaying core modules | Medium — delayed launch | High | Strict phase gates; feature flags; MVP within each phase |
| 6 | Third-party dependency vulnerabilities | Medium — security | Medium | Dependabot; lock file; regular audit; pin major versions |
| 7 | Data loss | Critical | Low | Daily backups; WAL archiving; backup verification; disaster recovery plan |
| 8 | Multi-tenant data leakage | Critical | Low | Repository-level company_id enforcement; integration tests per query |
| 9 | Auth.js breaking changes | Medium — auth downtime | Low | Pin version; test upgrades in staging; abstract auth behind interface |
| 10 | Offline attendance sync conflicts | Medium — data inconsistency | Medium | Last-write-wins with audit; conflict resolution UI; idempotent punch API |

---

## 26. Best Practices

### 26.1 Development Workflow

1. Read this architecture document before starting any module.
2. Create module following standard folder structure (Section 3.1).
3. Define Zod schemas before use cases.
4. Define repository interface before implementation.
5. Write use case with permission checks and audit logging.
6. Create thin Server Action wrapper.
7. Build UI using shared components.
8. Write unit tests for use cases and domain services.
9. Write integration tests for repository implementations.

### 26.2 Code Review Checklist

- [ ] Follows folder structure and naming conventions
- [ ] No business logic in UI components
- [ ] Permission check on server side
- [ ] Input validated with Zod
- [ ] Audit log for sensitive mutations
- [ ] Soft delete used (not hard delete)
- [ ] company_id filter on all queries
- [ ] Error handling uses AppError hierarchy
- [ ] No secrets or PII in logs
- [ ] TypeScript strict — no `any`

### 26.3 Testing Strategy

| Level | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | Use cases, domain services, utils |
| Integration | Vitest + test DB | Repositories, API routes |
| E2E | Playwright | Critical user flows |
| Performance | k6 (future) | API load testing |

Minimum coverage targets: 80% for use cases and domain services.

### 26.4 Documentation

- Architecture Decision Records (ADRs) in `docs/adr/` for significant choices.
- Module README in each `src/modules/{module}/README.md` (Phase 2+).
- API documentation via OpenAPI spec in `docs/api/` (Phase 7).

---

## 27. Recommendations

### 27.1 Immediate Next Steps (Phase 1 Implementation)

1. **Initialize Next.js 15 project** with TypeScript, Tailwind v4, ESLint, strict config.
2. **Install core dependencies:** shadcn/ui, TanStack Query, TanStack Table, React Hook Form, Zod, Auth.js, Prisma, Redis client, pino.
3. **Set up Docker Compose** for local PostgreSQL + Redis.
4. **Implement Auth.js** with credentials provider and database sessions.
5. **Create Prisma schema** for Phase 1 entities: companies, users, roles, permissions, sessions, audit_logs.
6. **Build permission engine** in `src/shared/permissions/`.
7. **Build app shell** — sidebar, header, theme toggle, login page.
8. **Establish CI pipeline** — lint, typecheck, test on push.

### 27.2 Technology Recommendations

| Decision | Recommendation | Alternative Considered |
|----------|----------------|----------------------|
| Auth | Auth.js v5 | Clerk (cost at scale), Lucia (less ecosystem) |
| Cache | Redis | Upstash Redis for serverless future |
| State | TanStack Query + Zustand | Redux (overkill), Jotai (less ecosystem) |
| Logging | pino | Winston (slower) |
| Testing | Vitest | Jest (slower, ESM issues) |
| Monorepo | Single Next.js app | Turborepo (unnecessary complexity now) |
| Job Queue | BullMQ (Phase 4+) | pg-boss (simpler but less features) |

### 27.3 Team Recommendations

- Assign module ownership to developers (e.g., Dev A → Employee + Attendance, Dev B → Payroll).
- Weekly architecture review to ensure pattern compliance.
- Shared component library maintained by rotating ownership.
- Security review before Phase 4 (Payroll) launch.

### 27.4 Operational Recommendations

- Set up staging environment before Phase 2 completion.
- Load test with 10K synthetic employees before Phase 4.
- Establish on-call rotation before production launch.
- Document runbooks for: deployment, rollback, backup restore, pay run failure recovery.

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-23 | Architecture Team | Initial baseline — formally approved |

---

**Architecture Version 1.0 Approved** — 2026-07-23

Future prompts must extend this architecture without breaking previous decisions.

