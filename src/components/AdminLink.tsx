import { Link } from "react-router-dom";
import { SignedIn } from "@clerk/clerk-react";
import { Settings } from "lucide-react";
import { CLERK_PUBLISHABLE_KEY, isClerkConfigured } from "@/providers/clerkConfig";

const link = (
  <Link
    to="/admin"
    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
  >
    <Settings className="h-4 w-4" /> Admin
  </Link>
);

/**
 * The link into the admin ledger, shown only to signed in visitors.
 *
 * Everyone else sees the savings progress and nothing that suggests the page
 * is editable. This is presentation only: the route itself is gated by
 * RequireSignIn, and writes are gated on the server by requireAdmin.
 *
 * When Clerk is not configured nobody can sign in, so the link is shown
 * unconditionally rather than hiding the admin page from everyone forever.
 */
const AdminLink = () => {
  if (!isClerkConfigured(CLERK_PUBLISHABLE_KEY)) {
    return link;
  }
  return <SignedIn>{link}</SignedIn>;
};

export default AdminLink;
