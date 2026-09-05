import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

const month = (year: number, monthIndex: number) => ({
  year,
  monthIndex,
  contributions: { Atem: 1000, Anyang: 500 },
  withdrawal: 0,
  repayment: 0,
});

describe("ledger.append", () => {
  test("stores a month", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.ledger.append, month(2026, 0));
    const rows = await t.query(api.ledger.list, {});
    expect(rows).toHaveLength(1);
    expect(rows[0].contributions.Atem).toBe(1000);
  });

  test("rejects a duplicate month", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.ledger.append, month(2026, 0));
    await expect(t.mutation(api.ledger.append, month(2026, 0))).rejects.toThrow(/already exists/i);
  });

  test("allows the same month in a different year", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.ledger.append, month(2026, 0));
    await t.mutation(api.ledger.append, month(2027, 0));
    expect(await t.query(api.ledger.list, {})).toHaveLength(2);
  });

  test("rejects a negative contribution", async () => {
    const t = convexTest(schema, modules);
    const bad = { ...month(2026, 0), contributions: { Atem: -5 } };
    await expect(t.mutation(api.ledger.append, bad)).rejects.toThrow(/negative/i);
  });

  test("rejects a fractional contribution", async () => {
    const t = convexTest(schema, modules);
    const bad = { ...month(2026, 0), contributions: { Atem: 10.5 } };
    await expect(t.mutation(api.ledger.append, bad)).rejects.toThrow(/whole number/i);
  });

  test("rejects a negative withdrawal", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.ledger.append, { ...month(2026, 0), withdrawal: -1 })
    ).rejects.toThrow(/negative/i);
  });

  test("rejects an out of range month index", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.ledger.append, month(2026, 12))).rejects.toThrow(/month/i);
  });

  test("rejects an implausible year", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.ledger.append, month(1900, 0))).rejects.toThrow(/year/i);
  });
});

describe("ledger.list", () => {
  test("returns months in chronological order regardless of insertion order", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.ledger.append, month(2026, 6));
    await t.mutation(api.ledger.append, month(2026, 0));
    await t.mutation(api.ledger.append, month(2025, 11));

    const rows = await t.query(api.ledger.list, {});
    expect(rows.map((r) => [r.year, r.monthIndex])).toEqual([
      [2025, 11],
      [2026, 0],
      [2026, 6],
    ]);
  });

  test("returns an empty array for a fresh database", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.ledger.list, {})).toEqual([]);
  });
});

describe("ledger.update", () => {
  test("corrects the amounts of an existing month", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.ledger.append, month(2026, 0));

    await t.mutation(api.ledger.update, {
      id,
      contributions: { Atem: 1000, Anyang: 750 },
      withdrawal: 200,
      repayment: 50,
    });

    const rows = await t.query(api.ledger.list, {});
    expect(rows[0].contributions.Anyang).toBe(750);
    expect(rows[0].withdrawal).toBe(200);
    expect(rows[0].repayment).toBe(50);
  });

  test("rejects invalid amounts", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.ledger.append, month(2026, 0));
    await expect(
      t.mutation(api.ledger.update, {
        id,
        contributions: { Atem: -1 },
        withdrawal: 0,
        repayment: 0,
      })
    ).rejects.toThrow(/negative/i);
  });
});

describe("ledger writes respect the admin switch", () => {
  test("anonymous writes are blocked once requireAuthForAdmin is on", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) =>
      ctx.db.insert("settings", {
        requireAuthForAdmin: true,
        requireAuthForViewer: false,
        adminEmails: ["atem@example.com"],
        targetAmount: 40000,
      })
    );
    await expect(t.mutation(api.ledger.append, month(2026, 0))).rejects.toThrow(/sign in/i);
  });

  test("reading is still allowed while only the admin switch is on", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) =>
      ctx.db.insert("settings", {
        requireAuthForAdmin: true,
        requireAuthForViewer: false,
        adminEmails: [],
        targetAmount: 40000,
      })
    );
    await expect(t.query(api.ledger.list, {})).resolves.toEqual([]);
  });
});
