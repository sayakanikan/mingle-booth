import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile?.();
} catch {
  // Ignored if .env does not exist
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres',
  },
});
