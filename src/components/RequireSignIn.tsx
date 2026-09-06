import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { ArrowLeft } from "lucide-react";
import { CLERK_PUBLISHABLE_KEY, isClerkConfigured } from "@/providers/clerkConfig";

/**
 * Gates a route behind being signed in.
 *
 * This is a convenience, not the security boundary. The real enforcement is
 * requireAdmin in convex/lib/auth.ts, which runs on the server for every
 * write. Hiding a page only stops honest people from wandering in; anyone can
 * call a Convex mutation directly with the deployment URL, so the server check
 * is what actually protects the ledger.
 *
 * When Clerk is not configured at all there is no way for anyone to sign in,
 * so gating would lock everybody out permanently. In that case this renders
 * its children, matching how the app behaved before sign in existed.
 */
const RequireSignIn = ({ children }: { children: ReactNode }) => {
  if (!isClerkConfigured(CLERK_PUBLISHABLE_KEY)) {
    return <>{children}</>;
  }

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="max-w-sm w-full rounded-lg border bg-card p-6 text-center space-y-4">
            <h1 className="text-xl font-extrabold text-foreground">Admin ledger</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to record contributions and correct entries. The savings
              progress itself stays open to everyone.
            </p>
            <SignInButton mode="modal">
              <button className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90">
                Sign in
              </button>
            </SignInButton>
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Back to the tracker
            </Link>
          </div>
        </div>
      </SignedOut>
    </>
  );
};

export default RequireSignIn;
