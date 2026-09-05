import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("seed.run", () => {
  test("populates an empty database with the historical months", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(internal.seed.run, {});

    expect(result.seeded).toBe(true);
    expect(result.months).toBe(7);

    const rows = await t.query(api.ledger.list, {});
    expect(rows).toHaveLength(7);
    expect(rows[0].year).toBe(2026);
    expect(rows[0].monthIndex).toBe(0);
    expect(rows[6].monthIndex).toBe(6);
  });

  test("creates the settings row with authentication switched off", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.run, {});

    const settings = await t.query(api.settings.get, {});
    expect(settings.requireAuthForAdmin).toBe(false);
    expect(settings.requireAuthForViewer).toBe(false);
    expect(settings.targetAmount).toBe(40000);
  });

  test("refuses to run twice", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.run, {});
    const second = await t.mutation(internal.seed.run, {});

    expect(second.seeded).toBe(false);
    expect(await t.query(api.ledger.list, {})).toHaveLength(7);
  });

  test("creates the settings row even when the ledger was already populated another way", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) =>
      ctx.db.insert("ledger", {
        year: 2026,
        monthIndex: 0,
        contributions: {},
        withdrawal: 0,
        repayment: 0,
      })
    );

    const result = await t.mutation(internal.seed.run, {});

    expect(result.seeded).toBe(false);
    expect(result.months).toBe(0);

    const settings = await t.query(api.settings.get, {});
    expect(settings.requireAuthForAdmin).toBe(false);
    expect(settings.requireAuthForViewer).toBe(false);
  });

  test("reproduces the balance the app shows today", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.run, {});
    const rows = await t.query(api.ledger.list, {});

    const balance = rows.reduce((sum, r) => {
      const contributed = Object.values(r.contributions).reduce((s, v) => s + v, 0);
      return sum + contributed - r.withdrawal + r.repayment;
    }, 0);

    expect(balance).toBe(11257);
  });
});
