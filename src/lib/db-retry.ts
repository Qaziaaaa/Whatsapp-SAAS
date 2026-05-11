/**
 * Database query retry utility.
 *
 * Prisma connection errors (P1001, P1002) can occur transiently in
 * serverless environments where the connection pool may be cold.
 * This utility retries the query once after a 500ms delay.
 *
 * Only retries on connection errors — not on query errors (P2xxx)
 * which indicate data issues that retrying won't fix.
 */

const RETRY_DELAY_MS = 500;

// Prisma connection error codes
const CONNECTION_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

function isPrismaConnectionError(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    return CONNECTION_ERROR_CODES.has((error as { code: string }).code);
  }
  // Also catch generic connection refused errors
  if (error instanceof Error) {
    return (
      error.message.includes("Can't reach database server") ||
      error.message.includes("Connection refused") ||
      error.message.includes("ECONNREFUSED")
    );
  }
  return false;
}

/**
 * Executes a database operation with a single retry on connection errors.
 *
 * @param fn - The async database operation to execute
 * @returns The result of the operation
 * @throws The original error if it's not a connection error, or the retry error
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      console.warn("[DB] Connection error, retrying after 500ms...", {
        error: error instanceof Error ? error.message : String(error),
      });

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

      // Single retry — if this fails too, let the error propagate
      return await fn();
    }

    throw error;
  }
}
