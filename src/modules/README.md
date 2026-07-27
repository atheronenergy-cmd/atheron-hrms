# Modules

Feature modules (bounded contexts) for Atheron HRMS.

Each module follows the standard structure defined in `docs/ARCHITECTURE.md` Section 3.1:

```
{module}/
├── domain/
├── application/
├── infrastructure/
├── validation/
├── components/
├── hooks/
└── index.ts
```

Modules are implemented incrementally per the development roadmap.
