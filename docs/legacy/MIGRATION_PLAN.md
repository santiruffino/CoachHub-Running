# Migration Plan (Archived)

This file is retained as historical context.

The NestJS -> Next.js + Supabase migration has already been executed for core product paths.

For current architecture and operational status, use:

- `README.md`
- `documentation/backend.md`
- `docs/MIGRATION_STATUS.md`
- `documentation/platform-analysis-report.md`

If further migration work is needed, treat it as incremental modernization:

1. deprecate remaining legacy non-v2 endpoints
2. consolidate invitation acceptance path variants
3. standardize error/i18n handling across APIs
4. keep docs aligned with current runtime, not planned runtime
