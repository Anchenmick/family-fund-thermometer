# Convex Persistence and Dormant Clerk Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the family ledger off per-browser `localStorage` into a shared Convex database, and wire Clerk authentication that is fully built but switched off until two booleans in the database are flipped.

**Architecture:** Convex holds two tables, `ledger` (one row per month) and `settings` (exactly one row). Every write calls a `requireAdmin` guard that short-circuits while `settings.requireAuthForAdmin` is false, so the same code path serves both the open and locked states. The React app keeps all existing pure calculation functions untouched and adapts Convex documents into the existing `MonthlyRecord` shape.

**Tech Stack:** Vite 5, React 18, TypeScript, Convex 1.45, `convex-test`, Vitest 3, `@clerk/clerk-react`, shadcn/ui, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-05-convex-persistence-and-clerk-auth-design.md`

## Global Constraints

- **No em-dashes** (U+2014) or en-dashes used as punctuation breaks in any file, including code comments and commit messages. Verify with `grep -rn $'—' . --exclude-dir=.git --exclude-dir=node_modules` returning nothing.
- **Commit message trailer:** every commit ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Branch:** all work lands on `feature/convex-persistence-clerk-auth`. Do not commit to `main`.
- **Never commit `.env.local`.** It holds `CONVEX_DEPLOY_KEY`, a write credential. It is already covered by the `*.local` rule in `.gitignore`.
- **Convex deployment:** development work targets `pastel-pheasant-942`. Production seeding is out of scope for this plan; it needs a production deploy key that does not exist yet.
- **`settings` has no public write mutation.** It is only ever written by the seed, or by hand in the Convex dashboard. Adding a mutation that writes it would let any user grant themselves access.
- **Money is whole dollars.** Every amount is a non-negative integer. Reject anything else at the mutation boundary.
- **Amounts, years, and months must be validated server side**, not only in the UI. Convex mutations are callable by anyone holding the deployment URL.

---

## File Structure

**Convex backend (new directory `convex/`):**

| File | Responsibility |
|---|---|
| `convex/schema.ts` | Table definitions and the `by_period` index. Nothing else. |
| `convex/lib/auth.ts` | `DEFAULT_SETTINGS`, `getSettings`, `requireAdmin`, `requireViewer`. The only place that decides whether auth is enforced. |
| `convex/settings.ts` | The public `get` query. Deliberately narrow so `adminEmails` cannot leak. |
| `convex/ledger.ts` | `list`, `append`, `update`, plus amount validation. |
| `convex/seedData.ts` | The seven historical months as data. No logic. |
| `convex/seed.ts` | Idempotent `internalMutation` that populates an empty database. |
| `convex/auth.config.ts` | Clerk JWT issuer wiring. Inert while the env var is unset. |

**Frontend (existing `src/`):**

| File | Responsibility |
|---|---|
| `src/lib/period.ts` | New. Month abbreviations and `formatPeriod(year, monthIndex)`. |
| `src/lib/convexAdapter.ts` | New. Maps a Convex ledger document to the existing `MonthlyRecord` shape. |
| `src/providers/AppProviders.tsx` | New. Decides whether Clerk mounts, and supplies the Convex client. |
| `src/lib/data.ts` | Modified. Loses all `localStorage` code, keeps `members` and the pure calculations. |
| `src/components/Thermometer.tsx` | Modified. Takes a `target` prop, derives its tick scale. |
| `src/components/MemberCard.tsx` | Modified. Takes a `target` prop. |
| `src/pages/Index.tsx` | Modified. Reads from Convex, handles loading. |
| `src/pages/Admin.tsx` | Modified. Writes through Convex mutations. |
| `src/App.tsx` | Modified. Wrapped by `AppProviders`. |
| `src/components/ContributionTable.tsx` | **Unchanged.** |
| `vitest.config.ts` | Modified. Two projects, because Convex tests need the edge runtime, not jsdom. |

**Why `convex/lib/auth.ts` is its own file:** it is the single security boundary. Keeping it separate from the functions that call it means a reviewer can read the entire authorization story in forty lines, and the guard tests have one obvious target.

---

### Task 1: Convex scaffolding, schema, and the test harness

Sets up the backend directory, the two tables, and a Vitest project that can run Convex functions. Nothing else in the plan can be tested until this exists.

**Files:**
- Modify: `package.json` (dependencies)
- Create: `convex/schema.ts`
- Modify: `vitest.config.ts`
- Test: `convex/schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the `ledger` and `settings` tables; `convex/_generated/server` exporting `query`, `mutation`, `internalMutation`, `QueryCtx`, `MutationCtx`; `convex/_generated/api` exporting `api` and `internal`.

- [ ] **Step 1: Install dependencies**

`convex-test` runs Convex functions in-process. It requires the edge runtime environment, which is why `@edge-runtime/vm` comes along.

```bash
npm install convex
npm install -D convex-test @edge-runtime/vm
```

- [ ] **Step 2: Write the failing test**

Create `convex/schema.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL, cannot resolve `./schema`. The Convex project has no files yet.

- [ ] **Step 4: Write the schema**

Create `convex/schema.ts`:

```ts
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
```

- [ ] **Step 5: Configure Vitest for two environments**

The app tests need jsdom. Convex tests need the edge runtime. One config cannot be both, so split into projects.

Replace `vitest.config.ts` entirely:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: { "@": path.resolve(__dirname, "./src") },
        },
        test: {
          name: "app",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
        },
      },
      {
        test: {
          name: "convex",
          environment: "edge-runtime",
          globals: true,
          include: ["convex/**/*.test.ts"],
          server: { deps: { inline: ["convex-test"] } },
        },
      },
    ],
  },
});
```

- [ ] **Step 6: Push the schema and generate types**

This creates `convex/_generated/`, which later tasks import. `CONVEX_DEPLOY_KEY` in `.env.local` supplies credentials, so this runs without a browser login.

Run: `npx convex dev --once`
Expected: schema pushed to `pastel-pheasant-942`, `convex/_generated/` created.

Verify: `npx convex data` lists the `ledger` and `settings` tables.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, both new tests plus the existing example test.

- [ ] **Step 8: Commit**

`convex/_generated/` is committed on purpose. It contains the typed API surface that the frontend imports, and a fresh clone must typecheck without running the Convex CLI first.

```bash
git add convex package.json package-lock.json vitest.config.ts
git commit -m "Add Convex schema and test harness

Two tables: ledger keyed by (year, monthIndex) so ordering survives the
move off an in-memory array, and a single settings row that will hold the
authentication switches.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Characterization tests for the existing calculations

Before changing where data comes from, lock in what the calculations currently produce. These tests are the safety net for every later task, and they cover functions that today have none.

**Files:**
- Test: `src/lib/data.test.ts`

**Interfaces:**
- Consumes: existing exports of `src/lib/data.ts`: `calcMonthContribTotal`, `calcMonthNet`, `calcTotalBalance`, `calcMemberTotal`, `calcMonthlyTotals`, type `MonthlyRecord`.
- Produces: nothing consumed by later tasks. This is a safety net.

- [ ] **Step 1: Write the tests**

Create `src/lib/data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  calcMemberTotal,
  calcMonthContribTotal,
  calcMonthNet,
  calcMonthlyTotals,
  calcTotalBalance,
  MonthlyRecord,
} from "./data";

const jan: MonthlyRecord = {
  month: "Jan 2026",
  contributions: { Atem: 1000, Anyang: 500 },
};

const feb: MonthlyRecord = {
  month: "Feb 2026",
  contributions: { Atem: 1000, Anyang: 0 },
  withdrawal: 9500,
};

const mar: MonthlyRecord = {
  month: "Mar 2026",
  contributions: { Atem: 1000, Anyang: 500 },
  repayment: 850,
};

describe("calcMonthContribTotal", () => {
  it("sums the contributions", () => {
    expect(calcMonthContribTotal(jan)).toBe(1500);
  });

  it("is zero when nobody contributed", () => {
    expect(calcMonthContribTotal({ month: "x", contributions: {} })).toBe(0);
  });
});

describe("calcMonthNet", () => {
  it("equals contributions when there is no movement", () => {
    expect(calcMonthNet(jan)).toBe(1500);
  });

  it("subtracts a withdrawal", () => {
    expect(calcMonthNet(feb)).toBe(1000 - 9500);
  });

  it("adds a repayment", () => {
    expect(calcMonthNet(mar)).toBe(1500 + 850);
  });
});

describe("calcTotalBalance", () => {
  it("sums the net of every month, including negatives", () => {
    expect(calcTotalBalance([jan, feb, mar])).toBe(1500 - 8500 + 2350);
  });

  it("is zero for an empty ledger", () => {
    expect(calcTotalBalance([])).toBe(0);
  });
});

describe("calcMemberTotal", () => {
  it("sums one member across months", () => {
    expect(calcMemberTotal([jan, feb, mar], "Atem")).toBe(3000);
  });

  it("treats a member absent from a month as zero", () => {
    expect(calcMemberTotal([jan, feb, mar], "Fran")).toBe(0);
  });
});

describe("calcMonthlyTotals", () => {
  it("accumulates a running balance in order", () => {
    const totals = calcMonthlyTotals([jan, feb, mar]);
    expect(totals.map((t) => t.cumulative)).toEqual([1500, -7000, -4650]);
  });

  it("preserves the month labels", () => {
    const totals = calcMonthlyTotals([jan, feb]);
    expect(totals.map((t) => t.month)).toEqual(["Jan 2026", "Feb 2026"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they pass**

These describe code that already exists, so they pass immediately. That is expected for characterization tests. If any fails, stop: the current behavior differs from what this plan assumes, and the plan needs revisiting before continuing.

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data.test.ts
git commit -m "Add characterization tests for ledger calculations

Locks in current behavior before the data source changes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Period formatting helper

The database stores `year` and `monthIndex`. The UI shows `"Jan 2026"`. This is the one small conversion, and it is pure, so it gets its own tested module.

**Files:**
- Create: `src/lib/period.ts`
- Test: `src/lib/period.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `MONTH_ABBREVIATIONS: readonly string[]` (length 12, `"Jan"` first) and `formatPeriod(year: number, monthIndex: number): string`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/period.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MONTH_ABBREVIATIONS, formatPeriod } from "./period";

describe("MONTH_ABBREVIATIONS", () => {
  it("has twelve months starting at January", () => {
    expect(MONTH_ABBREVIATIONS).toHaveLength(12);
    expect(MONTH_ABBREVIATIONS[0]).toBe("Jan");
    expect(MONTH_ABBREVIATIONS[11]).toBe("Dec");
  });
});

describe("formatPeriod", () => {
  it("formats January as month index zero", () => {
    expect(formatPeriod(2026, 0)).toBe("Jan 2026");
  });

  it("formats December as month index eleven", () => {
    expect(formatPeriod(2026, 11)).toBe("Dec 2026");
  });

  it("matches the labels already used in the seeded data", () => {
    expect(formatPeriod(2026, 6)).toBe("Jul 2026");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL, cannot resolve `./period`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/period.ts`:

```ts
// Typed as readonly string[] rather than "as const". A const assertion would
// narrow this to a tuple of literals, and MONTH_ABBREVIATIONS.indexOf(month)
// in Admin.tsx passes a plain string, which such a tuple rejects.
export const MONTH_ABBREVIATIONS: readonly string[] = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Renders a stored (year, monthIndex) pair as the label the UI shows. */
export function formatPeriod(year: number, monthIndex: number): string {
  return `${MONTH_ABBREVIATIONS[monthIndex]} ${year}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/period.ts src/lib/period.test.ts
git commit -m "Add period formatting helper

Converts stored (year, monthIndex) into the Jan 2026 label the UI uses.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Settings access and the authorization guard

The security boundary. Everything about whether auth is enforced lives here.

**Files:**
- Create: `convex/lib/auth.ts`
- Create: `convex/settings.ts`
- Test: `convex/auth.test.ts`

**Interfaces:**
- Consumes: `ledger`/`settings` tables from Task 1.
- Produces:
  - `DEFAULT_SETTINGS: { requireAuthForAdmin: false, requireAuthForViewer: false, adminEmails: string[], targetAmount: 40000 }`
  - `getSettings(ctx): Promise<{ requireAuthForAdmin: boolean; requireAuthForViewer: boolean; adminEmails: string[]; targetAmount: number }>`
  - `requireAdmin(ctx): Promise<UserIdentity | null>`
  - `requireViewer(ctx): Promise<UserIdentity | null>`
  - `api.settings.get` returning `{ requireAuthForAdmin, requireAuthForViewer, targetAmount }` and nothing more.

- [ ] **Step 1: Write the failing tests**

Create `convex/auth.test.ts`. The four guard cases are the point of this task. Note the deliberate absence of `adminEmails` from the query result.

```ts
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { requireAdmin, requireViewer } from "./lib/auth";

const modules = import.meta.glob("./**/*.ts");

const ADMIN = "atem@example.com";
const STRANGER = "someone@example.com";

async function withSettings(t: ReturnType<typeof convexTest>, overrides: Record<string, unknown>) {
  await t.run(async (ctx) =>
    ctx.db.insert("settings", {
      requireAuthForAdmin: false,
      requireAuthForViewer: false,
      adminEmails: [ADMIN],
      targetAmount: 40000,
      ...overrides,
    })
  );
}

describe("settings.get", () => {
  test("returns defaults when no settings row exists", async () => {
    const t = convexTest(schema, modules);
    const settings = await t.query(api.settings.get, {});
    expect(settings.requireAuthForAdmin).toBe(false);
    expect(settings.requireAuthForViewer).toBe(false);
    expect(settings.targetAmount).toBe(40000);
  });

  test("never exposes the admin email list", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, {});
    const settings = await t.query(api.settings.get, {});
    expect(settings).not.toHaveProperty("adminEmails");
    expect(JSON.stringify(settings)).not.toContain(ADMIN);
  });
});

describe("requireAdmin", () => {
  test("allows anonymous access while the flag is off", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForAdmin: false });
    await expect(t.run(async (ctx) => requireAdmin(ctx))).resolves.toBeNull();
  });

  test("rejects anonymous access once the flag is on", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForAdmin: true });
    await expect(t.run(async (ctx) => requireAdmin(ctx))).rejects.toThrow(/sign in/i);
  });

  test("rejects a signed in user who is not an admin", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForAdmin: true });
    const asStranger = t.withIdentity({ email: STRANGER, subject: "u2" });
    await expect(asStranger.run(async (ctx) => requireAdmin(ctx))).rejects.toThrow(/admin/i);
  });

  test("allows a listed admin", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForAdmin: true });
    const asAdmin = t.withIdentity({ email: ADMIN, subject: "u1" });
    await expect(asAdmin.run(async (ctx) => requireAdmin(ctx))).resolves.not.toBeNull();
  });

  test("matches admin emails case insensitively", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForAdmin: true });
    const asAdmin = t.withIdentity({ email: ADMIN.toUpperCase(), subject: "u1" });
    await expect(asAdmin.run(async (ctx) => requireAdmin(ctx))).resolves.not.toBeNull();
  });
});

describe("requireViewer", () => {
  test("allows anonymous access while the flag is off", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForViewer: false });
    await expect(t.run(async (ctx) => requireViewer(ctx))).resolves.toBeNull();
  });

  test("rejects anonymous access once the flag is on", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForViewer: true });
    await expect(t.run(async (ctx) => requireViewer(ctx))).rejects.toThrow(/sign in/i);
  });

  test("admin and viewer switches are independent", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForAdmin: true, requireAuthForViewer: false });
    await expect(t.run(async (ctx) => requireViewer(ctx))).resolves.toBeNull();
    await expect(t.run(async (ctx) => requireAdmin(ctx))).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot resolve `./lib/auth`.

- [ ] **Step 3: Write the guard**

Create `convex/lib/auth.ts`:

```ts
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
```

- [ ] **Step 4: Write the public settings query**

Create `convex/settings.ts`. The return shape is written out field by field rather than spreading, so that adding a private field to the table later cannot leak it by accident.

```ts
import { query } from "./_generated/server";
import { getSettings } from "./lib/auth";

/**
 * Public. Returns only what the browser needs to render.
 * adminEmails is deliberately excluded so that a public page cannot
 * enumerate who the admins are.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const settings = await getSettings(ctx);
    return {
      requireAuthForAdmin: settings.requireAuthForAdmin,
      requireAuthForViewer: settings.requireAuthForViewer,
      targetAmount: settings.targetAmount,
    };
  },
});
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all guard cases green.

- [ ] **Step 6: Commit**

```bash
git add convex/lib/auth.ts convex/settings.ts convex/auth.test.ts
git commit -m "Add settings access and the admin authorization guard

Two independent switches read from the settings row. Both default off, so
behavior is unchanged until they are flipped in the Convex dashboard. The
public settings query excludes adminEmails.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Ledger queries and mutations

**Files:**
- Create: `convex/ledger.ts`
- Test: `convex/ledger.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `requireViewer` from Task 4.
- Produces:
  - `api.ledger.list` returning ledger documents ordered by `(year, monthIndex)` ascending.
  - `api.ledger.append` with args `{ year, monthIndex, contributions, withdrawal, repayment }`, returning the new `Id<"ledger">`.
  - `api.ledger.update` with args `{ id, contributions, withdrawal, repayment }`, returning `null`. The period is not editable; a month entered under the wrong date is deleted in the dashboard rather than moved.

- [ ] **Step 1: Write the failing tests**

Create `convex/ledger.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot resolve `./ledger`.

- [ ] **Step 3: Write the implementation**

Create `convex/ledger.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Push the functions**

Run: `npx convex dev --once`
Expected: functions deployed without type errors.

- [ ] **Step 6: Commit**

```bash
git add convex/ledger.ts convex/ledger.test.ts
git commit -m "Add ledger list, append and update functions

Server side validation of amounts and periods, duplicate month rejection,
and chronological ordering from the by_period index. Writes go through the
admin guard.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Seed data and the seeding mutation

**Files:**
- Create: `convex/seedData.ts`
- Create: `convex/seed.ts`
- Test: `convex/seed.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_SETTINGS` from Task 4.
- Produces: `SEED_MONTHS` (array of 7 month records) and `internal.seed.run` returning `{ seeded: boolean; months: number }`.

- [ ] **Step 1: Write the failing tests**

Create `convex/seed.test.ts`:

```ts
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
```

The final assertion is the important one. `11257` is the balance the live app displays today, so it proves the migration preserves the real numbers rather than merely inserting seven rows.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot resolve `./seed`.

- [ ] **Step 3: Write the seed data**

Create `convex/seedData.ts`. These values are copied from `defaultRecords` in `src/lib/data.ts`, confirmed by the user as the authoritative starting point.

```ts
/**
 * The fund's history as of the migration off localStorage.
 * Copied verbatim from defaultRecords in src/lib/data.ts.
 */
export const SEED_MONTHS = [
  {
    year: 2026, monthIndex: 0,
    contributions: { Atem: 1000, Anyang: 500, Anchen: 500, Mummy: 500, Daddy: 500, Randalls: 500, Fran: 500 },
    withdrawal: 0, repayment: 0,
  },
  {
    year: 2026, monthIndex: 1,
    contributions: { Atem: 1000, Anyang: 500, Anchen: 500, Mummy: 500, Daddy: 500, Randalls: 500, Fran: 0 },
    withdrawal: 0, repayment: 0,
  },
  {
    year: 2026, monthIndex: 2,
    contributions: { Atem: 1000, Anyang: 500, Anchen: 1000, Mummy: 500, Daddy: 500, Randalls: 0, Fran: 0 },
    withdrawal: 0, repayment: 0,
  },
  {
    year: 2026, monthIndex: 3,
    contributions: { Atem: 1000, Anyang: 57, Anchen: 500, Mummy: 0, Daddy: 200, Randalls: 0, Fran: 0 },
    withdrawal: 9500, repayment: 0,
  },
  {
    year: 2026, monthIndex: 4,
    contributions: { Atem: 1000, Anyang: 0, Anchen: 500, Mummy: 0, Daddy: 0, Randalls: 0, Fran: 0 },
    withdrawal: 0, repayment: 850,
  },
  {
    year: 2026, monthIndex: 5,
    contributions: { Atem: 1000, Anyang: 0, Anchen: 500, Mummy: 0, Daddy: 0, Randalls: 0, Fran: 0 },
    withdrawal: 0, repayment: 2650,
  },
  {
    year: 2026, monthIndex: 6,
    contributions: { Atem: 1000, Anyang: 0, Anchen: 500, Mummy: 0, Daddy: 0, Randalls: 0, Fran: 0 },
    withdrawal: 0, repayment: 0,
  },
];
```

- [ ] **Step 4: Write the seeding mutation**

Create `convex/seed.ts`. It is an `internalMutation`, so it is not callable from the browser, only from the CLI and dashboard.

```ts
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, including the balance assertion of 11257.

- [ ] **Step 6: Seed the development deployment**

Run: `npx convex run seed:run`
Expected: `{ seeded: true, months: 7 }`

Verify: `npx convex data ledger` shows seven rows.

- [ ] **Step 7: Commit**

```bash
git add convex/seed.ts convex/seedData.ts convex/seed.test.ts
git commit -m "Add idempotent seed for the existing ledger history

Seeds the seven months recorded in data.ts plus the default settings row.
A test asserts the seeded balance equals 11257, the figure the app shows
today, so the migration is verified to preserve real numbers.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Convex client and conditional Clerk mounting

Wires providers. Clerk mounts only when a publishable key exists, which is how the app keeps working today with no Clerk configuration at all.

**Files:**
- Modify: `package.json` (add `@clerk/clerk-react`)
- Create: `convex/auth.config.ts`
- Create: `src/providers/AppProviders.tsx`
- Create: `src/providers/clerkConfig.ts`
- Modify: `src/App.tsx`
- Test: `src/providers/clerkConfig.test.ts`

**Interfaces:**
- Consumes: `VITE_CONVEX_URL`, `VITE_CLERK_PUBLISHABLE_KEY` from the environment.
- Produces: `isClerkConfigured(key: string | undefined): boolean`, and `AppProviders` as a default export wrapping children.

- [ ] **Step 1: Install Clerk**

```bash
npm install @clerk/clerk-react
```

- [ ] **Step 2: Write the failing test**

The mounting decision is extracted into a pure function so it can be tested without rendering a provider tree.

Create `src/providers/clerkConfig.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isClerkConfigured } from "./clerkConfig";

describe("isClerkConfigured", () => {
  it("is false when the key is missing", () => {
    expect(isClerkConfigured(undefined)).toBe(false);
  });

  it("is false when the key is an empty string", () => {
    expect(isClerkConfigured("")).toBe(false);
  });

  it("is false when the key is only whitespace", () => {
    expect(isClerkConfigured("   ")).toBe(false);
  });

  it("is true for a real publishable key", () => {
    expect(isClerkConfigured("pk_test_abc123")).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL, cannot resolve `./clerkConfig`.

- [ ] **Step 4: Write the config helper**

Create `src/providers/clerkConfig.ts`:

```ts
/**
 * Whether Clerk should be mounted at all.
 *
 * This is separate from whether signing in is REQUIRED. That is decided by
 * the requireAuthForAdmin and requireAuthForViewer booleans in the Convex
 * settings row. Mounting Clerk only makes signing in possible.
 */
export function isClerkConfigured(key: string | undefined): boolean {
  return typeof key === "string" && key.trim().length > 0;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Write the Convex auth config**

Create `convex/auth.config.ts`. Guarded so an unset variable produces an empty provider list rather than a malformed one.

```ts
const domain = process.env.CLERK_JWT_ISSUER_DOMAIN;

export default {
  providers: domain ? [{ domain, applicationID: "convex" }] : [],
};
```

- [ ] **Step 7: Write the providers**

Create `src/providers/AppProviders.tsx`:

```tsx
import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { isClerkConfigured } from "./clerkConfig";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not set. Check .env.local.");
}

const convex = new ConvexReactClient(convexUrl);
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

/**
 * Clerk is mounted only when a publishable key is present. With no key the
 * app runs exactly as it did before authentication existed, which is the
 * intended state until the fund is ready to switch signing in on.
 */
const AppProviders = ({ children }: { children: ReactNode }) => {
  if (!isClerkConfigured(clerkKey)) {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
  }

  return (
    <ClerkProvider publishableKey={clerkKey as string}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
};

export default AppProviders;
```

- [ ] **Step 8: Wrap the app**

Modify `src/App.tsx`. Add the import and make `AppProviders` the outermost wrapper inside the existing tree:

```tsx
import AppProviders from "./providers/AppProviders";
```

Change the `App` body so that `AppProviders` wraps `QueryClientProvider`:

```tsx
const App = () => (
  <AppProviders>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AppProviders>
);
```

- [ ] **Step 9: Verify the app still builds and runs**

Run: `npm run build`
Expected: build succeeds.

Run: `npm run dev`, then open `http://localhost:8080/`.
Expected: the page renders as before. It still reads from `localStorage` at this point, because the pages have not been migrated yet. This step only proves the provider tree is sound.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json convex/auth.config.ts src/providers src/App.tsx
git commit -m "Add Convex client and conditional Clerk mounting

Clerk mounts only when a publishable key is present, which keeps the app
running unchanged until the fund is ready to enable signing in. Whether
sign in is required stays a separate decision held in the settings row.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Adapter, and components taking an explicit target

Prepares the display layer so the next two tasks only have to change where data comes from.

**Files:**
- Create: `src/lib/convexAdapter.ts`
- Test: `src/lib/convexAdapter.test.ts`
- Modify: `src/components/Thermometer.tsx`
- Modify: `src/components/MemberCard.tsx`

**Interfaces:**
- Consumes: `formatPeriod` from Task 3, `MonthlyRecord` from `src/lib/data.ts`.
- Produces:
  - `LedgerDoc` type: `{ _id: string; year: number; monthIndex: number; contributions: Record<string, number>; withdrawal: number; repayment: number }`
  - `docToRecord(doc: LedgerDoc): MonthlyRecord`
  - `Thermometer` props become `{ current: number; target: number }`
  - `MemberCard` props become `{ member: FamilyMember; records: MonthlyRecord[]; target: number }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/convexAdapter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { docToRecord, LedgerDoc } from "./convexAdapter";
import { calcMonthNet } from "./data";

const doc: LedgerDoc = {
  _id: "abc123",
  year: 2026,
  monthIndex: 3,
  contributions: { Atem: 1000, Anyang: 57 },
  withdrawal: 9500,
  repayment: 0,
};

describe("docToRecord", () => {
  it("derives the display label from the period", () => {
    expect(docToRecord(doc).month).toBe("Apr 2026");
  });

  it("carries the contributions through unchanged", () => {
    expect(docToRecord(doc).contributions).toEqual({ Atem: 1000, Anyang: 57 });
  });

  it("carries withdrawal and repayment through", () => {
    const record = docToRecord(doc);
    expect(record.withdrawal).toBe(9500);
    expect(record.repayment).toBe(0);
  });

  it("produces a record the existing calculations accept", () => {
    expect(calcMonthNet(docToRecord(doc))).toBe(1057 - 9500);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL, cannot resolve `./convexAdapter`.

- [ ] **Step 3: Write the adapter**

Create `src/lib/convexAdapter.ts`:

```ts
import { MonthlyRecord } from "./data";
import { formatPeriod } from "./period";

export interface LedgerDoc {
  _id: string;
  year: number;
  monthIndex: number;
  contributions: Record<string, number>;
  withdrawal: number;
  repayment: number;
}

/**
 * Maps a stored document into the shape the existing components and
 * calculations already understand. Keeping this translation in one place is
 * what lets ContributionTable and every calc function stay untouched.
 */
export function docToRecord(doc: LedgerDoc): MonthlyRecord {
  return {
    month: formatPeriod(doc.year, doc.monthIndex),
    contributions: doc.contributions,
    withdrawal: doc.withdrawal,
    repayment: doc.repayment,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Make Thermometer take a target**

Modify `src/components/Thermometer.tsx`. Remove the `TARGET` import, add the prop, and derive the scale. The scale must follow the target, otherwise a changed goal would move the mercury while the printed numbers beside it still said 40,000.

Replace the top of the file, from the import through the `steps` declaration:

```tsx
interface ThermometerProps {
  current: number;
  target: number;
}

const Thermometer = ({ current, target }: ThermometerProps) => {
  const percentage = Math.min((current / target) * 100, 100);
  // Nine labels, eight even divisions, so the printed scale always matches
  // the goal rather than assuming 40,000.
  const steps = Array.from({ length: 9 }, (_, i) => Math.round((target / 8) * i));
```

Then replace the single remaining use of `TARGET` further down:

```tsx
          ${(target - current).toLocaleString()} to go
```

- [ ] **Step 6: Make MemberCard take a target**

Modify `src/components/MemberCard.tsx`. Change the import on line 1 to drop `TARGET`:

```tsx
import { FamilyMember, calcMemberTotal, members, MonthlyRecord } from "@/lib/data";
```

Change the props interface and the `fairShare` calculation:

```tsx
interface MemberCardProps {
  member: FamilyMember;
  records: MonthlyRecord[];
  target: number;
}

const MemberCard = ({ member, records, target }: MemberCardProps) => {
  const total = calcMemberTotal(records, member.name);
  const fairShare = target / members.length;
```

- [ ] **Step 7: Pass the target from Index for now**

`Index.tsx` still imports `TARGET`, so pass it through to keep the app compiling. Task 9 replaces it with the value from Convex.

In `src/pages/Index.tsx`, update the two usages:

```tsx
          <Thermometer current={balance} target={TARGET} />
```

```tsx
              <MemberCard key={m.name} member={m} records={records} target={TARGET} />
```

- [ ] **Step 8: Verify build and tests**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/lib/convexAdapter.ts src/lib/convexAdapter.test.ts src/components/Thermometer.tsx src/components/MemberCard.tsx src/pages/Index.tsx
git commit -m "Add Convex document adapter and pass the goal as a prop

Thermometer and MemberCard read the goal from a prop instead of importing
a constant, and the thermometer scale is derived from it so the printed
numbers cannot disagree with the fill level.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Dashboard reads from Convex

**Files:**
- Modify: `src/pages/Index.tsx`

**Interfaces:**
- Consumes: `api.ledger.list`, `api.settings.get`, `docToRecord`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Rewrite the data source**

Modify `src/pages/Index.tsx`. Replace the imports and the top of the component.

New imports, replacing the `useState` and `loadRecords` imports:

```tsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { docToRecord } from "@/lib/convexAdapter";
import { members, calcTotalBalance, calcMonthlyTotals } from "@/lib/data";
```

Replace the component's opening lines. `useQuery` returns `undefined` while loading, so both results are checked before anything is calculated. Without this the page crashes on first paint.

```tsx
const Index = () => {
  const ledger = useQuery(api.ledger.list);
  const settings = useQuery(api.settings.get);

  if (ledger === undefined || settings === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading the fund...</p>
      </div>
    );
  }

  const records = ledger.map(docToRecord);
  const target = settings.targetAmount;

  const USD_TO_EUR = 0.86078;
  const balance = calcTotalBalance(records);
  const balanceEur = Math.round(balance * USD_TO_EUR);
  const monthlyTotals = calcMonthlyTotals(records);
  const monthsElapsed = monthlyTotals.length;
  const avgMonthly = monthsElapsed > 0 ? balance / monthsElapsed : 0;
  const monthsRemaining = avgMonthly > 0 ? Math.ceil((target - balance) / avgMonthly) : Infinity;
```

- [ ] **Step 2: Replace every remaining use of TARGET**

Four places in the JSX still reference `TARGET`. Change each to `target`:

```tsx
              Together to <span className="font-bold text-accent">${target.toLocaleString()}</span>
```

```tsx
          <Thermometer current={balance} target={target} />
```

```tsx
                <div className="text-2xl font-extrabold text-foreground">${(target - balance).toLocaleString()}</div>
```

```tsx
              <MemberCard key={m.name} member={m} records={records} target={target} />
```

- [ ] **Step 3: Verify against the real database**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`, then open `http://localhost:8080/`.

Expected: after a brief "Loading the fund..." the dashboard shows a balance of **$11,257**, the same figure as before the migration. The seven months appear in the breakdown table in chronological order.

If the number differs, stop. The seed did not reproduce the previous data and the cause must be found before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "Read the dashboard from Convex

The dashboard now renders shared data from the database instead of a copy
private to each browser. Adds a loading state, since query results arrive
asynchronously where localStorage was synchronous.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Admin writes through Convex

**Files:**
- Modify: `src/pages/Admin.tsx`

**Interfaces:**
- Consumes: `api.ledger.list`, `api.ledger.append`, `api.ledger.update`, `docToRecord`, `MONTH_ABBREVIATIONS`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Replace imports and state**

Modify `src/pages/Admin.tsx`. Replace the data imports with Convex hooks. The local `MONTHS` array is dropped in favor of the shared `MONTH_ABBREVIATIONS`, so the month ordering used by the form and by the database cannot drift apart.

```tsx
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { docToRecord } from "@/lib/convexAdapter";
import { MONTH_ABBREVIATIONS } from "@/lib/period";
import { members, calcMonthNet, calcTotalBalance, MonthlyRecord } from "@/lib/data";
```

Delete the local `const MONTHS = [...]` line. Keep `YEARS`.

- [ ] **Step 2: Replace the component's data layer**

Replace the state and the `persist` and `handleUpdate` functions:

```tsx
const Admin = () => {
  const ledger = useQuery(api.ledger.list);
  const appendMonth = useMutation(api.ledger.append);
  const updateMonth = useMutation(api.ledger.update);

  const [month, setMonth] = useState("Jan");
  const [year, setYear] = useState("2026");
  const [amounts, setAmounts] = useState<Record<string, string>>(emptyAmounts);
  const [withdrawal, setWithdrawal] = useState("0");
  const [repayment, setRepayment] = useState("0");

  if (ledger === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading the ledger...</p>
      </div>
    );
  }

  const records = ledger.map(docToRecord);

  const handleUpdate = async (index: number, record: MonthlyRecord) => {
    try {
      await updateMonth({
        id: ledger[index]._id,
        contributions: record.contributions,
        withdrawal: record.withdrawal || 0,
        repayment: record.repayment || 0,
      });
      toast({ title: "Entry updated", description: record.month });
    } catch (error) {
      toast({
        title: "Could not update",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };
```

The `MonthlyRecord` type is imported above because `handleUpdate` takes one.

- [ ] **Step 3: Replace the append handler**

The duplicate check and the amount validation now live on the server, so the client stops duplicating them and instead surfaces whatever the server says. Client side parsing stays, because turning form strings into numbers is a UI concern.

```tsx
  const handleAppend = async () => {
    const monthIndex = MONTH_ABBREVIATIONS.indexOf(month);
    const contributions: Record<string, number> = {};
    for (const m of members) {
      const v = Number(amounts[m.name]);
      if (isNaN(v) || v < 0) {
        toast({ title: "Invalid amount", description: `Check ${m.name}`, variant: "destructive" });
        return;
      }
      contributions[m.name] = Math.round(v);
    }
    const w = Number(withdrawal);
    const r = Number(repayment);
    if (isNaN(w) || w < 0 || isNaN(r) || r < 0) {
      toast({ title: "Invalid withdrawal/repayment", variant: "destructive" });
      return;
    }

    try {
      await appendMonth({
        year: Number(year),
        monthIndex,
        contributions,
        withdrawal: Math.round(w),
        repayment: Math.round(r),
      });
      const net = calcMonthNet({ month: `${month} ${year}`, contributions, withdrawal: Math.round(w), repayment: Math.round(r) });
      setAmounts(emptyAmounts());
      setWithdrawal("0");
      setRepayment("0");
      toast({ title: "Month added", description: `${month} ${year} • Net $${net.toLocaleString()}` });
    } catch (error) {
      toast({
        title: "Could not add month",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const balance = calcTotalBalance(records);
```

- [ ] **Step 4: Point the month dropdown at the shared list**

```tsx
                  {MONTH_ABBREVIATIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
```

- [ ] **Step 5: Fix two prose em-dashes already in this file**

Both pre-date this branch and violate the global no-em-dash rule. This task
is already rewriting the file, so they are corrected here.

Line 111, replace the em-dash with a comma:

```tsx
              Append-only ledger. Enter what happened this period, contributions, any withdrawal (loan out), any
```

Line 170, replace the em-dash with a period and a new sentence:

```tsx
            Use the pencil icon only to correct a mistake. Do not overwrite real history.
```

Leave the `"—"` placeholder glyphs in `ContributionTable.tsx` and
`Index.tsx` alone. Those are an "empty value" symbol in table cells, not
prose, and changing them would alter the UI's visual language.

- [ ] **Step 6: Verify writes actually persist**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`, open `http://localhost:8080/admin`.

Check each of the following:
1. The ledger shows the seven seeded months.
2. Adding **Aug 2026** with any amounts succeeds and the row appears.
3. **Reloading the page keeps the new row.** This is the behavior that did not exist before.
4. Opening `http://localhost:8080/` shows a balance that includes the new month.
5. Adding **Aug 2026** a second time is rejected with the server's duplicate message.
6. Editing a row with the pencil icon persists across a reload.

Then remove the test month so the ledger holds only real data:

Run: `npx convex data ledger` to find the test row's id, and delete it in the Convex dashboard.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Admin.tsx
git commit -m "Write admin ledger changes through Convex

Appends and edits now persist to the shared database and survive reloads.
Duplicate and amount validation moved to the server, with its messages
surfaced in the existing toasts.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Delete the localStorage layer

The old persistence is now dead code, and it is dangerous dead code: `CURRENT_VERSION` exists purely to wipe stored data.

**Files:**
- Modify: `src/lib/data.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `src/lib/data.ts` exporting only `FamilyMember`, `MonthlyRecord`, `members`, and the five calculation functions.

- [ ] **Step 1: Confirm nothing still uses the old exports**

Run: `grep -rn "loadRecords\|saveRecords\|defaultRecords\|CURRENT_VERSION\|STORAGE_KEY\|DATA_VERSION_KEY\|TARGET" src/ --exclude=data.ts`

Expected: no matches. If anything appears, that file was missed in an earlier task and must be migrated first.

`src/lib/data.ts` is excluded because it still defines these exports at this
point. The question this step answers is whether anything still *consumes*
them. Step 4 greps again without the exclusion, after the deletion.

- [ ] **Step 2: Delete the dead code**

Modify `src/lib/data.ts`. Remove, in order:
- the `TARGET` constant, now `settings.targetAmount`
- `STORAGE_KEY`, `DATA_VERSION_KEY`, `CURRENT_VERSION`
- the entire `defaultRecords` array, now `convex/seedData.ts`
- the `loadRecords` function
- the `saveRecords` function

Keep `FamilyMember`, `MonthlyRecord`, `members`, and all five `calc*` functions untouched.

Add a note at the top of the file so the next reader knows where the data went:

```ts
// Ledger data lives in Convex (see convex/ledger.ts). This module holds the
// member roster and the pure calculations that operate on ledger records,
// so both stay independent of where the records are stored.
```

- [ ] **Step 3: Verify nothing broke**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: PASS. The characterization tests from Task 2 still pass, proving the calculations are unchanged.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Confirm the wipe mechanism is really gone**

Run: `grep -rn "localStorage" src/`
Expected: no matches outside `src/components/ui/`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data.ts
git commit -m "Remove the localStorage persistence layer

Deletes loadRecords, saveRecords, the seed defaults, and the version key
whose only purpose was to wipe stored records on a version bump. The
module now holds the member roster and pure calculations only.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Document the rollout and verify the whole branch

Leaves behind the operational knowledge needed to switch auth on later. Without this the flags are a trap: turning `requireAuthForAdmin` on before adding admin emails locks everyone out, including the person who flipped it.

**Files:**
- Create: `docs/convex-and-auth.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: documentation only.

- [ ] **Step 1: Write the operations note**

Create `docs/convex-and-auth.md`:

````markdown
# Database and authentication

Ledger data lives in Convex. There is no local fallback: the app requires
`VITE_CONVEX_URL` to be set.

## Local setup

1. Copy the Convex deployment URL into `.env.local` as `VITE_CONVEX_URL`.
2. Put a deploy key in `.env.local` as `CONVEX_DEPLOY_KEY`.
3. Run `npx convex dev` alongside `npm run dev`.

Quote every value in `.env.local`. A Convex deploy key contains a `|`
character, which a shell reads as a pipe and silently truncates the value.

## Seeding a fresh deployment

```bash
npx convex run seed:run
```

Idempotent. It refuses to act if the ledger already holds anything, so it
cannot duplicate history.

## Switching authentication on

Authentication is built and switched off. Two independent booleans in the
`settings` row control it, and they are changed in the Convex dashboard.
There is deliberately no mutation that writes them, because a user who could
call it could grant themselves access.

| Field | Effect when true |
|---|---|
| `requireAuthForAdmin` | Writing the ledger requires a signed in user whose email is in `adminEmails`. |
| `requireAuthForViewer` | Viewing the dashboard requires any signed in user. |

**Follow this order.** Setting `requireAuthForAdmin` to true while
`adminEmails` is empty locks out everybody, including you. Recovering means
editing the row back in the dashboard.

1. Create a Clerk JWT template named exactly `convex` (Clerk dashboard,
   Configure, JWT Templates, Convex preset). Copy the issuer URL.
2. `npx convex env set CLERK_JWT_ISSUER_DOMAIN <issuer url>`
3. Put the Clerk publishable key in `.env.local` as
   `VITE_CLERK_PUBLISHABLE_KEY`. People can now sign in. Nothing requires it.
4. Add the admin email addresses to `adminEmails` in the dashboard.
5. Sign in yourself and confirm the account is recognized.
6. Only now set `requireAuthForAdmin` to true.

Every step is reversible by putting the row back the way it was.

The Clerk secret key is not used anywhere in this project. Convex verifies
Clerk's JWT directly, so no Clerk secret belongs in this repository.
````

- [ ] **Step 2: Point the README at it**

Modify `README.md`. Add this immediately after the `## Project info` section:

```markdown
## Data and authentication

Ledger data is stored in Convex, not in the browser. Setup, seeding, and how
to switch authentication on are documented in
[docs/convex-and-auth.md](docs/convex-and-auth.md).
```

- [ ] **Step 3: Full verification of the branch**

Run each and confirm:

```bash
npx tsc --noEmit          # no errors
npm test                  # all tests pass
npm run build             # build succeeds
npm run lint              # no new errors
```

Check the em-dash prohibition:

```bash
grep -rn $'—' . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist \
  | grep -v 'ContributionTable.tsx' | grep -v 'Index.tsx:5'
```
Expected: no matches.

The two exclusions are the pre-existing `"—"` placeholder glyphs in table
cells, left in place deliberately (they are an empty-value symbol, not
prose). Every prose em-dash, including the two corrected in Task 10, must be
gone.

Confirm no secret is staged:

```bash
git status --short         # .env.local must NOT appear
git log --stat -1
```

- [ ] **Step 4: Manual end to end check**

With `npm run dev` running:

1. `http://localhost:8080/` shows a balance of $11,257.
2. `http://localhost:8080/admin` lists seven months in order.
3. Add a month, reload, and confirm it survived.
4. Open the same URL in a different browser or a private window and confirm
   the new month is visible there too. This is the property localStorage
   never had, and is the whole point of the change.
5. Delete the test month in the Convex dashboard.

- [ ] **Step 5: Commit**

```bash
git add docs/convex-and-auth.md README.md
git commit -m "Document Convex setup and the authentication rollout

Records the order in which the auth switches must be flipped, since
enabling requireAuthForAdmin before adding admin emails locks everyone out.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Out of scope, deliberately

- **Production deployment and seeding.** Needs a production deploy key that does not exist yet. Real family data is meant to live there, so this is the first follow-up.
- **Member management UI.** `members` stays hardcoded in `src/lib/data.ts`.
- **Sign in and sign out UI.** No `SignInButton` or `UserButton` is added, because with Clerk unmounted there is nothing to render. This belongs to the task that turns auth on.
- **Route guarding for `/admin`.** While `requireAuthForAdmin` is false the server accepts anonymous writes, so a client side route guard would be theater. It belongs with step 6 of the rollout.
- **Removing the `lovable-tagger` dependency and the Lovable README boilerplate.**
