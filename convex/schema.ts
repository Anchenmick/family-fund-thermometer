import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // One document per month of the fund's history.
  // Ordering comes from (year, monthIndex), never from insertion order,
  // because database rows have no inherent order.
  ledger: defineTable({
    year: v.number(),
    monthIndex: v.number(), // 0 is January
    contributions: v.record(v.string(), v.number()),
    withdrawal: v.number(),
    repayment: v.number(),
  }).index("by_period", ["year", "monthIndex"]),

  // Exactly one document. The single source of truth for whether
  // authentication is enforced. Written by the seed or by hand in the
  // Convex dashboard, never by a public mutation.
  settings: defineTable({
    requireAuthForAdmin: v.boolean(),
    requireAuthForViewer: v.boolean(),
    adminEmails: v.array(v.string()),
    targetAmount: v.number(),
  }),
});
