// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientType = any;

// Prisma client singleton — prevents multiple instances during Next.js hot-reload.
// The actual PrismaClient is imported dynamically to handle the case where
// `prisma generate` hasn't been run yet (e.g., during CI type-checking).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as unknown as { prisma: PrismaClientType };

function createPrismaClient(): PrismaClientType {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require("@prisma/client");
    return new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error"]
          : ["error"],
    });
  } catch {
    // Prisma client not generated yet — return a proxy that throws helpful errors
    return new Proxy(
      {},
      {
        get: () => {
          throw new Error(
            "Prisma Client is not generated. Run `npx prisma generate` after setting up your database."
          );
        },
      }
    );
  }
}

export const prisma: PrismaClientType =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
