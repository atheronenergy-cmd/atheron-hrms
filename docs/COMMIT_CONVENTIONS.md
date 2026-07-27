# Commit Conventions

Atheron HRMS follows [Conventional Commits](https://www.conventionalcommits.org/).

## Format

```
<type>(<scope>): <description>

[optional body]
```

## Types

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes nor adds |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `test` | Adding or updating tests |
| `chore` | Maintenance, deps, config |
| `perf` | Performance improvement |

## Scopes

Use module name: `employee`, `payroll`, `attendance`, `auth`, `ui`, `infra`

## Examples

```
feat(employee): add bulk import use case
fix(payroll): correct PF calculation rounding
docs(architecture): add ADR for caching strategy
chore(deps): upgrade prisma to 6.8
```
