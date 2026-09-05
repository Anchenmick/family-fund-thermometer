import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

/**
 * Used when the settings row does not exist yet, so a fresh deployment is
 * open rather than locked. Auth starts off by design.
 */
export const DEFAULT_SETTINGS = {
  requireAuthForAdmin: false,
  requireAuthForViewer: false,
  adminEmails: [] as string[],
  targetAmount: 40000,
};

export async function getSettings(ctx: Ctx) {
  const row = await ctx.db.query("settings").first();
  if (!row) return DEFAULT_SETTINGS;
  return {
    requireAuthForAdmin: row.requireAuthForAdmin,
    requireAuthForViewer: row.requireAuthForViewer,
    adminEmails: row.adminEmails,
    targetAmount: row.targetAmount,
  };
}

/**
 * Gate for every write. Returns null while the switch is off, so the same
 * call site works in both the open and the locked state.
 */
export async function requireAdmin(ctx: Ctx) {
  const settings = await getSettings(ctx);
  if (!settings.requireAuthForAdmin) return null;

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Please sign in to make changes.");

  const email = identity.email?.toLowerCase();
  const allowed = settings.adminEmails.map((e) => e.toLowerCase());
  if (!email || !allowed.includes(email)) {
    throw new ConvexError("This account is not an admin of the fund.");
  }
  return identity;
}

/** Gate for reading the ledger. */
export async function requireViewer(ctx: Ctx) {
  const settings = await getSettings(ctx);
  if (!settings.requireAuthForViewer) return null;

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Please sign in to view the fund.");
  return identity;
}
