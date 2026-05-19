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

const isLocalDb = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const adapter = new PrismaPg({
  connectionString,
  ...(!isLocalDb && {
    ssl: { rejectUnauthorized: false },
  }),
});

const prismaCacheKey = `${connectionString}:${isLocalDb ? "nossl" : "ssl"}`;

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
