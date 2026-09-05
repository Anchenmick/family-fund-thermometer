// Convex statically analyzes this file at push time and refuses to deploy if
// CLERK_JWT_ISSUER_DOMAIN is unset entirely, regardless of the runtime guard
// below. The variable must exist, but an empty string is fine: it satisfies
// Convex's presence check and yields an empty providers array, which is the
// intended dormant state while Clerk auth is switched off. See
// docs/convex-and-auth.md for the exact command to set it.
const domain = process.env.CLERK_JWT_ISSUER_DOMAIN;

export default {
  providers: domain ? [{ domain, applicationID: "convex" }] : [],
};
