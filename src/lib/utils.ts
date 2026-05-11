import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a URL-safe slug from an organization name.
 * Converts to lowercase, replaces spaces and special chars with hyphens,
 * collapses multiple hyphens, and trims leading/trailing hyphens.
 * Example: "My Business! Co." → "my-business-co"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars except spaces and hyphens
    .replace(/[\s]+/g, "-")        // replace spaces with hyphens
    .replace(/-+/g, "-")           // collapse multiple hyphens
    .replace(/^-+|-+$/g, "");      // trim leading/trailing hyphens
}
