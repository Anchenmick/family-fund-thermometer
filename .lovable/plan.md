# Admin Section + Read-Only Landing Page

Split the app into two surfaces:
- **`/` (Landing)** — read-only visualization for everyone. Thermometer, member cards, monthly history, totals. No edit/add/delete controls.
- **`/admin` (Admin)** — spreadsheet-style editor where data is captured each month. This becomes the single source of truth.

## Admin page behavior

A simple Excel-like grid (rows = months, columns = each member + Withdrawal + Repayment + Net):

- **Add row:** a permanent empty "new month" row at the bottom. Type a month label and amounts, click Save → it's appended.
- **Edit existing rows:** inline cells. Since this is an accounting log, editing is discouraged but allowed for typo correction (with a small "Edit" toggle per row to prevent accidental changes). No destructive UX as the default.
- **No delete button.** Accounting log is append-only from the user's perspective.
- **Withdrawal / Repayment columns** stay as they are today — withdrawals subtract from total, repayments add back. Member contribution totals are unaffected by withdrawals (loans don't erase what people contributed).
- **Auto-calculated Net column** per row, plus a running cumulative total at the bottom.
- Data persists in `localStorage` exactly as today (no backend change requested).

## Landing page changes

- Remove the `Add Month` button, the row edit pencil, and the delete trash icon from `ContributionTable`.
- Keep the table purely as a read-only history view (still shows withdrawals/repayments/net).
- Add a discreet "Admin" link in the header to reach `/admin`.

## Technical changes

- **New route** `/admin` registered in `src/App.tsx` above the catch-all.
- **New page** `src/pages/Admin.tsx` containing the spreadsheet editor. Reuses `loadRecords` / `saveRecords` from `src/lib/data.ts` — no data model changes.
- **New component** `src/components/AdminSpreadsheet.tsx`: a grid built on the existing shadcn `Table` with always-editable inputs in an "append new month" row and an opt-in edit mode for existing rows. Replaces the need for `AddMonthDialog` on this page (dialog file stays for now, unused).
- **Refactor** `src/components/ContributionTable.tsx` into a read-only version (drop edit state, action column, `onUpdate`, `onDelete` props). Or introduce a `readOnly` prop and pass it from `Index`.
- **Update** `src/pages/Index.tsx`: remove `Add Month` button, remove update/delete handlers, render the read-only table, add a header link to `/admin`.
- No changes to `data.ts` business logic, storage version, or thermometer.

## Out of scope

- No auth/password on `/admin` (can be added later if you want to restrict access — say the word).
- No backend/database (still localStorage, per current architecture).
- No CSV import/export (can add later).
