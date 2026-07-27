# Docker

Container configuration for Atheron HRMS deployment.

## Local Development

Start PostgreSQL and Redis:

```bash
docker compose -f docker/docker-compose.yml up -d
```

## Production Build

```bash
docker build -f docker/Dockerfile -t atheron-hrms .
docker run -p 3000:3000 --env-file .env atheron-hrms
```

See `docs/ARCHITECTURE.md` Section 20 for full deployment strategy.
