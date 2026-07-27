# Prisma

Database schema, migrations, and seed scripts for Atheron HRMS.

## Structure

- `schema/` — Multi-file Prisma schema (enterprise models)
- `migrations/` — Version-controlled database migrations
- `seed/` — Seed scripts (company, roles, permissions)

## Commands

```bash
npm run db:generate   # Generate Prisma Client
npm run db:migrate    # Run migrations (dev)
npm run db:push       # Push schema without migration
npm run db:seed       # Run seed scripts
npm run db:studio     # Open Prisma Studio
```

## Documentation

See `docs/database/MODELS.md` for complete model reference.

See `docs/ARCHITECTURE.md` Section 6 for database planning conventions.
