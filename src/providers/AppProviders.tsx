import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { CLERK_PUBLISHABLE_KEY, isClerkConfigured } from "./clerkConfig";

/**
 * The production Convex deployment.
 *
 * This is not a secret. The browser connects to this endpoint directly, so the
 * URL is public by design, and access is controlled by the functions in
 * convex/, not by the address being hard to guess.
 *
 * It is a default rather than a required environment variable because the app
 * is hosted on Lovable, which builds from the repository and does not give us
 * a reliable place to set build time variables. Without a default, a hosted
 * build would have no database URL and would fail on load.
 *
 * Local development overrides this through VITE_CONVEX_URL in .env.local, which
 * points at the development deployment, so day to day work never touches the
 * family's real ledger.
 */
const PRODUCTION_CONVEX_URL = "https://shocking-bat-349.eu-west-1.convex.cloud";

const configuredUrl = (import.meta.env.VITE_CONVEX_URL as string | undefined)?.trim();
const convexUrl = configuredUrl || PRODUCTION_CONVEX_URL;

const convex = new ConvexReactClient(convexUrl);
const clerkKey = CLERK_PUBLISHABLE_KEY;

/**
 * Clerk is mounted only when a publishable key is present. With no key the
 * app runs exactly as it did before authentication existed, which is the
 * intended state until the fund is ready to switch signing in on.
 */
const AppProviders = ({ children }: { children: ReactNode }) => {
  if (!isClerkConfigured(clerkKey)) {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
  }

  return (
    <ClerkProvider publishableKey={clerkKey as string}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
};

export default AppProviders;
