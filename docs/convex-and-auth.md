# Database and authentication

Ledger data lives in Convex. There is no local fallback: the app requires
`VITE_CONVEX_URL` to be set.

## Local setup

1. Copy the Convex deployment URL into `.env.local` as `VITE_CONVEX_URL`.
2. Put a deploy key in `.env.local` as `CONVEX_DEPLOY_KEY`.
3. Set the Clerk issuer variable to an empty string before the first push:

   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN ""
   ```

   Convex statically analyzes `convex/auth.config.ts` and refuses to push if
   any environment variable referenced there is unset, regardless of any
   runtime guard in the file. Without this step, `npx convex dev` and
   `npx convex deploy` fail with "Environment variable
   CLERK_JWT_ISSUER_DOMAIN is used in auth config file but its value was not
   set", even though Clerk is deliberately dormant. An empty string satisfies
   Convex's presence check while `auth.config.ts` still produces an empty
   provider list, so nothing is actually enforced. Do not delete this
   variable to "fix" a deploy failure: that removes the value entirely and
   reproduces the same error. When authentication is eventually switched on,
   step 2 of the rollout below replaces this empty value with the real
   Clerk issuer URL rather than adding a new variable.
4. Run `npx convex dev` alongside `npm run dev`.

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

   This replaces the empty string set during local setup. It does not add a
   new variable.
3. Put the Clerk publishable key in `.env.local` as
   `VITE_CLERK_PUBLISHABLE_KEY`. People can now sign in. Nothing requires it.
4. Add the admin email addresses to `adminEmails` in the dashboard.
5. Sign in yourself and confirm the account is recognized.
6. Only now set `requireAuthForAdmin` to true.

Every step is reversible by putting the row back the way it was.

The Clerk secret key is not used anywhere in this project. Convex verifies
Clerk's JWT directly, so no Clerk secret belongs in this repository.
