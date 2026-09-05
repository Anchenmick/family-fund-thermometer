/**
 * Whether Clerk should be mounted at all.
 *
 * This is separate from whether signing in is REQUIRED. That is decided by
 * the requireAuthForAdmin and requireAuthForViewer booleans in the Convex
 * settings row. Mounting Clerk only makes signing in possible.
 */
export function isClerkConfigured(key: string | undefined): boolean {
  return typeof key === "string" && key.trim().length > 0;
}
