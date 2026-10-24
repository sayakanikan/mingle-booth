import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres';

// Force fresh PrismaClient instance on reload so schema changes take effect immediately
export const prisma: PrismaClient = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
