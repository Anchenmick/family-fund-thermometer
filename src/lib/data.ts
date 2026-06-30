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
}

export const TARGET = 40000;

export const members: FamilyMember[] = [
  { name: "Atem", shortName: "AT", monthlyDue: 1000 },
  { name: "Anyang", shortName: "AN", monthlyDue: 500 },
  { name: "Anchen", shortName: "AC", monthlyDue: 500 },
  { name: "Mummy", shortName: "MU", monthlyDue: 500 },
  { name: "Daddy", shortName: "DA", monthlyDue: 500 },
  { name: "Randalls", shortName: "RA", monthlyDue: 500 },
  { name: "Fran", shortName: "FR", monthlyDue: 500, irregular: true },
];

const STORAGE_KEY = "family-savings-records";
const DATA_VERSION_KEY = "family-savings-version";
const CURRENT_VERSION = "8";

const defaultRecords: MonthlyRecord[] = [
  {
    month: "Jan 2026",
    contributions: { Atem: 1000, Anyang: 500, Anchen: 500, Mummy: 500, Daddy: 500, Randalls: 500, Fran: 500 },
  },
  {
    month: "Feb 2026",
    contributions: { Atem: 1000, Anyang: 500, Anchen: 500, Mummy: 500, Daddy: 500, Randalls: 500, Fran: 0 },
  },
  {
    month: "Mar 2026",
    contributions: { Atem: 1000, Anyang: 500, Anchen: 1000, Mummy: 500, Daddy: 500, Randalls: 0, Fran: 0 },
  },
  {
    month: "Apr 2026",
    contributions: { Atem: 1000, Anyang: 57, Anchen: 500, Mummy: 0, Daddy: 200, Randalls: 0, Fran: 0 },
    withdrawal: 9500,
  },
  {
    month: "May 2026",
    contributions: { Atem: 1000, Anyang: 0, Anchen: 500, Mummy: 0, Daddy: 0, Randalls: 0, Fran: 0 },
    repayment: 850,
  },
  {
    month: "Jun 2026",
    contributions: { Atem: 1000, Anyang: 0, Anchen: 500, Mummy: 0, Daddy: 0, Randalls: 0, Fran: 0 },
    repayment: 2650,
  },
];

export function loadRecords(): MonthlyRecord[] {
  try {
    const version = localStorage.getItem(DATA_VERSION_KEY);
    if (version === CURRENT_VERSION) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } else {
      // Clear stale data and set new version
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(DATA_VERSION_KEY, CURRENT_VERSION);
    }
  } catch {}
  return defaultRecords;
}

export function saveRecords(records: MonthlyRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  localStorage.setItem(DATA_VERSION_KEY, CURRENT_VERSION);
}

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
