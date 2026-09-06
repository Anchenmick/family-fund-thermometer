import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { CLERK_PUBLISHABLE_KEY, isClerkConfigured } from "@/providers/clerkConfig";

/**
 * Renders Clerk's sign-in control when, and only when, Clerk is actually
 * mounted (a publishable key is present). SignedIn/SignedOut/SignInButton/
 * UserButton throw if rendered outside a ClerkProvider, so this must return
 * null rather than render them when there is no key. This keeps the app
 * working exactly as before whenever Clerk is not configured, which is the
 * default and current shipping state.
 */
const AuthControls = () => {
  if (!isClerkConfigured(CLERK_PUBLISHABLE_KEY)) {
    return null;
  }

  return (
    <div className="text-sm text-muted-foreground flex items-center gap-2">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="hover:text-foreground">Sign in</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
};

export default AuthControls;
