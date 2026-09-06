import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("schema", () => {
  test("stores a ledger month and reads it back", async () => {
    const t = convexTest(schema, modules);

    const id = await t.run(async (ctx) =>
      ctx.db.insert("ledger", {
        year: 2026,
        monthIndex: 0,
        contributions: { Atem: 1000, Anyang: 500 },
        withdrawal: 0,
        repayment: 0,
      })
    );

    const doc = await t.run(async (ctx) => ctx.db.get(id));
    expect(doc?.year).toBe(2026);
    expect(doc?.contributions.Atem).toBe(1000);
  });

  test("stores the settings row with auth switched off", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) =>
      ctx.db.insert("settings", {
        requireAuthForAdmin: false,
        requireAuthForViewer: false,
        adminEmails: [],
        targetAmount: 40000,
      })
    );

    const row = await t.run(async (ctx) => ctx.db.query("settings").first());
    expect(row?.requireAuthForAdmin).toBe(false);
    expect(row?.targetAmount).toBe(40000);
  });
});
