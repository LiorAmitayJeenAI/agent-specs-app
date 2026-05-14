import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaCacheKey?: string;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const prismaCacheKey = `${connectionString}:ssl`;

export const prisma =
  globalForPrisma.prismaCacheKey === prismaCacheKey && globalForPrisma.prisma
    ? globalForPrisma.prisma
    :
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaCacheKey = prismaCacheKey;
}
