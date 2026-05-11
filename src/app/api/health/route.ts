import { prisma } from "@/lib/prisma";

/**
 * Health check endpoint.
 * Returns 200 if the app and database are healthy, 503 if degraded.
 * Used by deployment platforms (Vercel, Railway) and monitoring tools.
 */
export async function GET() {
  let dbStatus = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  const isHealthy = dbStatus === "ok";

  return Response.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      database: dbStatus,
    },
    { status: isHealthy ? 200 : 503 }
  );
}
