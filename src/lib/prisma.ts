import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaProxy } from "@/lib/prismaProxy";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaCacheKey?: string;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const isLocalDb = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

  const adapter = new PrismaPg({
    connectionString,
    ...(!isLocalDb && {
      ssl: { rejectUnauthorized: false },
    }),
  });

  const cacheKey = `${connectionString}:${isLocalDb ? "nossl" : "ssl"}`;

  if (globalForPrisma.prismaCacheKey === cacheKey && globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaCacheKey = cacheKey;
  }

  return client;
}

export const prisma = createPrismaProxy<PrismaClient>(createPrismaClient);
