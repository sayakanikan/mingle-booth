---
name: prisma-migration
description: Use this skill when modifying schema.prisma, generating Prisma client, or managing database migrations for Mingle Booth.
---

# Prisma Database Migration Workflow

Follow these steps when making database schema modifications:

1. Update `prisma/schema.prisma` with the desired model changes. Keep table mappings (`@@map`) and column mappings (`@map`) consistent with the Postgres database.
2. Generate migration SQL without immediately applying:
   ```bash
   npx prisma migrate dev --create-only --name <migration_name>
   ```
3. Inspect the generated migration in `prisma/migrations/<timestamp>_<migration_name>/migration.sql` to verify:
   - No accidental data drops or column deletions without fallback.
   - Any PostgreSQL RLS policies remain secure (never add open policies like `for all using (true)`).
4. Apply the migration:
   ```bash
   npx prisma migrate deploy
   ```
5. Generate the updated Prisma client:
   ```bash
   npx prisma generate
   ```
6. Run TypeScript check:
   ```bash
   npm run typecheck
   ```
