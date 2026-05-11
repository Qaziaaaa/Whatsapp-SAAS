/**
 * RBAC permission helpers.
 *
 * Role hierarchy (highest to lowest):
 *   owner > admin > agent
 *
 * Usage in route handlers:
 *   const ctx = await requireAuthContext();
 *   requireAdmin(ctx.role); // throws ForbiddenError if agent
 */

export class ForbiddenError extends Error {
  constructor(message = "Forbidden: insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

type Role = "owner" | "admin" | "agent";

/**
 * Requires the user to be an owner.
 * Throws ForbiddenError for admin or agent roles.
 */
export function requireOwner(role: Role): void {
  if (role !== "owner") {
    throw new ForbiddenError(
      `Forbidden: this action requires the 'owner' role (current role: '${role}')`
    );
  }
}

/**
 * Requires the user to be an owner or admin.
 * Throws ForbiddenError for agent role.
 */
export function requireAdmin(role: Role): void {
  if (role !== "owner" && role !== "admin") {
    throw new ForbiddenError(
      `Forbidden: this action requires the 'admin' role or higher (current role: '${role}')`
    );
  }
}

/**
 * Requires the user to be any authenticated member (owner, admin, or agent).
 * Throws ForbiddenError only if the role is unrecognized.
 */
export function requireAgent(role: Role): void {
  if (!["owner", "admin", "agent"].includes(role)) {
    throw new ForbiddenError(
      `Forbidden: unrecognized role '${role}'`
    );
  }
}

/**
 * Returns true if the role is owner or admin.
 * Useful for conditional UI rendering without throwing.
 */
export function isAdminOrOwner(role: Role): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Returns true if the role is owner.
 */
export function isOwner(role: Role): boolean {
  return role === "owner";
}
