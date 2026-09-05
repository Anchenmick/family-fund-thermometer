import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { isClerkConfigured } from "./clerkConfig";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not set. Check .env.local.");
}

const convex = new ConvexReactClient(convexUrl);
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

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
