import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireViewer } from "./lib/auth";

const contributionsValidator = v.record(v.string(), v.number());

/**
 * Money is whole dollars. Validated here rather than only in the UI, because
 * mutations are callable by anyone holding the deployment URL.
 */
function assertAmount(label: string, value: number) {
  if (value < 0) {
    throw new ConvexError(`${label} cannot be negative.`);
  }
  if (!Number.isInteger(value)) {
    throw new ConvexError(`${label} must be a whole number of dollars.`);
  }
}

function assertAmounts(args: {
  contributions: Record<string, number>;
  withdrawal: number;
  repayment: number;
}) {
  for (const [name, amount] of Object.entries(args.contributions)) {
    assertAmount(`${name}'s contribution`, amount);
  }
  assertAmount("Withdrawal", args.withdrawal);
  assertAmount("Repayment", args.repayment);
}

function assertPeriod(year: number, monthIndex: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new ConvexError("Year looks wrong. Expected something between 2000 and 2100.");
  }
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new ConvexError("Month must be between January and December.");
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireViewer(ctx);
    return await ctx.db.query("ledger").withIndex("by_period").order("asc").collect();
  },
});

export const append = mutation({
  args: {
    year: v.number(),
    monthIndex: v.number(),
    contributions: contributionsValidator,
    withdrawal: v.number(),
    repayment: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    assertPeriod(args.year, args.monthIndex);
    assertAmounts(args);

    const existing = await ctx.db
      .query("ledger")
      .withIndex("by_period", (q) =>
        q.eq("year", args.year).eq("monthIndex", args.monthIndex)
      )
      .unique();

    if (existing) {
      throw new ConvexError("That month already exists. Edit it instead of adding it again.");
    }

    return await ctx.db.insert("ledger", args);
  },
});

/**
 * Corrects the amounts of a month that is already recorded. The period is
 * intentionally not editable: moving a month to a different date would let a
 * typo silently rewrite history under a different heading.
 */
export const update = mutation({
  args: {
    id: v.id("ledger"),
    contributions: contributionsValidator,
    withdrawal: v.number(),
    repayment: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    assertAmounts(args);

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("That month no longer exists.");

    await ctx.db.patch(args.id, {
      contributions: args.contributions,
      withdrawal: args.withdrawal,
      repayment: args.repayment,
    });
    return null;
  },
});
