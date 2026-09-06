/**
 * The Clerk publishable key, resolved in ONE place.
 *
 * "Publishable" is Clerk's word for a key meant to be public. It is compiled
 * into the browser bundle however it is supplied, so anyone loading the site
 * can read it either way, and it grants no access on its own. The Clerk
 * SECRET key is the sensitive one and is deliberately absent from this
 * project: Convex verifies Clerk's JWT directly and never needs it.
 *
 * The literal below is a default rather than a required environment variable
 * because the site is built by Lovable from this repository, and Lovable does
 * not pass build time variables through. A key supplied only through the
 * environment never reaches the published bundle, so no sign in control
 * appears. VITE_CLERK_PUBLISHABLE_KEY still overrides it locally.
 *
 * This belongs to the Clerk DEVELOPMENT instance, which carries strict usage
 * limits. Swap it, together with CLERK_JWT_ISSUER_DOMAIN on both Convex
 * deployments, for a production instance before the fund depends on sign in.
 *
 * Resolved here and imported everywhere so the app cannot end up half
 * configured: mounting ClerkProvider while the sign in control believes Clerk
 * is absent produces a page with no way to sign in and a stream of rejected
 * tokens.
 */
const DEFAULT_CLERK_PUBLISHABLE_KEY = "pk_test_bXVzaWNhbC1oYWdmaXNoLTQ0LmNsZXJrLmFjY291bnRzLmRldiQ";

const configured = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined)?.trim();

export const CLERK_PUBLISHABLE_KEY = configured || DEFAULT_CLERK_PUBLISHABLE_KEY;

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
