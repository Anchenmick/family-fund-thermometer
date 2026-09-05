// Ledger data lives in Convex (see convex/ledger.ts). This module holds the
// member roster and the pure calculations that operate on ledger records,
// so both stay independent of where the records are stored.

export interface FamilyMember {
  name: string;
  shortName: string;
  monthlyDue: number;
  irregular?: boolean;
}

export interface MonthlyRecord {
  month: string;
  contributions: Record<string, number>;
  withdrawal?: number;
  repayment?: number;
  /**
   * The underlying document id, when the record came from Convex. Used to
   * address the correct document for an edit regardless of the array
   * position it currently sits at, since ledger.list is reactive and sorted
   * by period, so positions can shift while a row is open for editing.
   */
  id?: string;
}

export const members: FamilyMember[] = [
  { name: "Atem", shortName: "AT", monthlyDue: 1000 },
  { name: "Anyang", shortName: "AN", monthlyDue: 500 },
  { name: "Anchen", shortName: "AC", monthlyDue: 500 },
  { name: "Mummy", shortName: "MU", monthlyDue: 500 },
  { name: "Daddy", shortName: "DA", monthlyDue: 500 },
  { name: "Randalls", shortName: "RA", monthlyDue: 500 },
  { name: "Fran", shortName: "FR", monthlyDue: 500, irregular: true },
];

export function calcMonthContribTotal(r: MonthlyRecord): number {
  return Object.values(r.contributions).reduce((s, v) => s + v, 0);
}

export function calcMonthNet(r: MonthlyRecord): number {
  return calcMonthContribTotal(r) - (r.withdrawal || 0) + (r.repayment || 0);
}

export function calcTotalBalance(records: MonthlyRecord[]): number {
  return records.reduce((sum, r) => sum + calcMonthNet(r), 0);
}

export function calcMemberTotal(records: MonthlyRecord[], name: string): number {
  return records.reduce((sum, r) => sum + (r.contributions[name] || 0), 0);
}

export function calcMonthlyTotals(records: MonthlyRecord[]) {
  let cumulative = 0;
  return records.map((r) => {
    const total = calcMonthNet(r);
    cumulative += total;
    return { month: r.month, total, cumulative };
  });
}
