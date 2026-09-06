# Convex persistence and dormant Clerk authentication

Date: 2026-09-05
Status: approved, ready for implementation planning

## Problem

The app has an admin ledger UI that does not really persist anything.

`src/lib/data.ts` keeps the ledger in `localStorage`, seeded from a hardcoded
`defaultRecords` array. Two consequences follow:

1. **Edits are private to one browser.** Each person sees their own copy.
   Nothing Anchen enters is ever visible to Atem.
2. **Edits are destroyed on demand.** `loadRecords()` compares a stored version
   string against the `CURRENT_VERSION` constant (currently `"9"`). On any
   mismatch it deletes the stored records and falls back to the hardcoded
   defaults. So every time someone ships new data by bumping that constant,
   every user's admin edits are wiped.

The git history confirms the workaround: commits such as "Added July 2026
payments" and "Updated June 2026 data" show that editing `data.ts` and
committing is the only mechanism that actually works. The admin UI is
decorative.

Separately, `/admin` is a public route. Anyone with the URL can open the ledger
and edit it.

## Goals

- Ledger data lives in Convex, shared by everyone, surviving deploys.
- The admin UI performs real writes.
- Clerk authentication is fully wired but **switched off**, and can be switched
  on later without a code change.
- Admin access and viewer access are switchable **independently**.

## Non-goals

- Member management UI. The `members` list stays hardcoded in `data.ts`. This is
  a deliberate deferral: making members editable implies CRUD UI that nobody
  has asked for.
- Per-member self-service contribution entry.
- Multi-currency handling. The EUR figure stays a display-time constant.

## Data model

Two tables in `convex/schema.ts`.

### `ledger`

One document per month.

```ts
{
  year: number,            // 2026
  monthIndex: number,      // 0..11, January is 0
  contributions: Record<string, number>,
  withdrawal: number,
  repayment: number,
}
```

Index: `by_period` on `["year", "monthIndex"]`.

**Why not keep `month: "Jan 2026"`?** The current code depends on array
insertion order to compute cumulative totals. Database rows have no inherent
order, and sorting the label strings alphabetically puts April before January.
Numeric `year` plus `monthIndex` sorts correctly and turns the duplicate-month
check into an indexed lookup rather than a table scan. The `"Jan 2026"` label
becomes a derived display value.

### `settings`

Exactly one document.

```ts
{
  requireAuthForAdmin: boolean,   // seeded false
  requireAuthForViewer: boolean,  // seeded false
  adminEmails: string[],          // seeded empty; Atem and Anchen added later
  targetAmount: number,           // seeded 40000, replaces the TARGET constant
}
```

This row is the single source of truth for whether authentication is enforced.
It is deliberately **not** an environment variable:

- Env vars would exist in two copies, one for the frontend and one for Convex,
  which can drift. Drift between "the UI thinks auth is off" and "the database
  thinks auth is on" is exactly where security holes live.
- Flipping a Convex row takes effect immediately for every connected client,
  with no redeploy.

There is **no public mutation that writes `settings`.** It is changed from the
Convex dashboard only. Otherwise a user could grant themselves access.

## Convex functions

### Queries

- `ledger.list` returns all months ordered by `by_period`. Enforces
  `requireAuthForViewer`.
- `settings.get` returns `{ requireAuthForAdmin, requireAuthForViewer,
  targetAmount }` **only**. `adminEmails` is never returned, so a public client
  cannot enumerate who the admins are.

### Mutations

- `ledger.append` creates a month. Rejects a duplicate `(year, monthIndex)`.
  Validates every amount as a non-negative integer. Calls `requireAdmin`.
- `ledger.update` corrects an existing month by id. Same validation. Calls
  `requireAdmin`.

### Internal

- `seed.run` is an `internalMutation`. Idempotent: it refuses to act if the
  `ledger` table is non-empty. Populates `settings` with the defaults above and
  the seven existing months from `convex/seedData.ts`.

## Authentication architecture

Two independent switches, both starting `false`, giving four valid states. The
most important property is that each switch tightens the client and the server
**at the same moment**.

### The guard

```ts
async function requireAdmin(ctx) {
  const settings = await getSettings(ctx);
  if (!settings.requireAuthForAdmin) return null;   // off: allow
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Sign in required");
  if (!settings.adminEmails.includes(identity.email)) {
    throw new ConvexError("Not an admin");
  }
  return identity;
}
```

Called at the top of every write. `ledger.list` performs the equivalent check
against `requireAuthForViewer`.

A client-side flag alone would be cosmetic, because Convex mutations are
callable by anyone holding the deployment URL. The server check is what makes
the switch real.

### Mounting Clerk versus requiring Clerk

These are deliberately separate concerns.

| Question | Decided by | Today |
|---|---|---|
| Is Clerk mounted at all? | presence of `VITE_CLERK_PUBLISHABLE_KEY` | absent, so no Clerk |
| Is signing in required? | the two `settings` booleans | both false |

This lets the app run exactly as it does now while all the auth code sits in
place, and it makes the rollout incremental: first add the key so people
*can* sign in, then flip a boolean so they *must*.

`convex/auth.config.ts` reads `CLERK_JWT_ISSUER_DOMAIN`, a Convex server
environment variable set with `npx convex env set`. While unset, Convex
validates no tokens, which is harmless because nothing requires them.

## Frontend changes

`ConvexProvider` wraps the app, built from `VITE_CONVEX_URL`. When the Clerk
publishable key is present, `ClerkProvider` and `ConvexProviderWithClerk` are
used instead.

**`ContributionTable` does not change at all.** This is achieved by keeping
every calculation function in `data.ts` pure and operating on
`MonthlyRecord[]`, with a thin adapter mapping Convex documents to that shape.
The pure functions stay trivially testable.

**`Thermometer` and `MemberCard` each gain a `target` prop.** Both currently
import the `TARGET` constant directly, so moving the goal into `settings`
forces the value to arrive from above instead. `Thermometer` additionally
hardcodes its tick scale as `[0, 5000, ..., 40000]`, which silently assumes a
40,000 goal; that scale becomes derived from `target` in eight even divisions.
Without this, a changed `targetAmount` would move the mercury while the printed
scale beside it kept saying 40,000, which is worse than not making the goal
configurable at all.

**Pages that change:**

- `Index.tsx` reads `useQuery(api.ledger.list)` instead of `useState(loadRecords)`.
- `Admin.tsx` calls `useMutation(api.ledger.append)` and `api.ledger.update`.

**Deleted:** `loadRecords`, `saveRecords`, `STORAGE_KEY`, `DATA_VERSION_KEY`,
`CURRENT_VERSION`, and the entire wipe-on-version-mismatch mechanism.
`defaultRecords` moves to `convex/seedData.ts` and survives only as seed input.

### Loading states

`loadRecords()` is synchronous, so both pages currently assume data exists on
first render. `useQuery` returns `undefined` while loading. Both pages need an
explicit loading state. This is small but easy to overlook, and omitting it
produces a crash on first paint rather than a graceful skeleton.

## Seeding

The seed takes the numbers currently in `data.ts`, covering January through
July 2026, confirmed by the user as the authoritative starting point.

Real family data is to live in the project's **production** deployment.
Development work runs against `pastel-pheasant-942`. Seeding production
requires a production deploy key, which is not yet available.

## Testing

- Unit tests for the pure calculation functions, which currently have none.
- `convex-test` coverage for `ledger.append` (success, duplicate rejection,
  negative and non-integer amounts) and `ledger.update`.
- Guard tests for `requireAdmin` in both flag states, with a mocked identity,
  covering: flag off allows anonymous writes; flag on rejects anonymous; flag
  on rejects a signed-in non-admin; flag on allows a listed admin.

The guard tests matter most. "Flipping the flag actually locks writes" is the
claim being trusted later, so it needs to be verified rather than assumed.

## Rollout sequence

1. Schema, functions, and tests against the dev deployment.
2. Frontend switched to Convex. App works, auth still off.
3. Production deployment created, seeded with real data.
4. Later: add the Clerk publishable key. People can sign in, nothing requires it.
5. Later: add Atem and Anchen to `adminEmails`, then set `requireAuthForAdmin`
   to true. The ledger locks.
6. Optional, later: set `requireAuthForViewer` to true if the dashboard should
   stop being public.

Steps 4 through 6 are each independently reversible by flipping the row back.

## Open items

- Production deploy key, needed for step 3.
- Clerk publishable key and the `convex` JWT template issuer URL, needed for
  step 4.
- Atem's and Anchen's Clerk email addresses, needed for step 5.
