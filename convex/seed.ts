import { internalMutation } from "./_generated/server";
import { DEFAULT_SETTINGS } from "./lib/auth";
import { SEED_MONTHS } from "./seedData";

/**
 * Populates a fresh deployment. Idempotent: refuses to act if the ledger
 * already holds anything, so running it twice cannot duplicate history.
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("ledger").first();
    if (existing) {
      return { seeded: false, months: 0 };
    }

    for (const month of SEED_MONTHS) {
      await ctx.db.insert("ledger", month);
    }

    const settings = await ctx.db.query("settings").first();
    if (!settings) {
      await ctx.db.insert("settings", DEFAULT_SETTINGS);
    }

    return { seeded: true, months: SEED_MONTHS.length };
  },
});
