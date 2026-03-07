export interface FamilyMember {
  name: string;
  shortName: string;
  monthlyDue: number;
  irregular?: boolean;
}

export interface MonthlyRecord {
  month: string; // e.g. "Jan 2025"
  contributions: Record<string, number>; // name -> amount
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

// Sample data — replace with real contributions
export const monthlyRecords: MonthlyRecord[] = [
  {
    month: "Jan 2025",
    contributions: { Atem: 1000, Anyang: 500, Anchen: 500, Mummy: 500, Daddy: 500, Randalls: 500, Fran: 200 },
  },
  {
    month: "Feb 2025",
    contributions: { Atem: 1000, Anyang: 500, Anchen: 500, Mummy: 500, Daddy: 500, Randalls: 500, Fran: 0 },
  },
  {
    month: "Mar 2025",
    contributions: { Atem: 1000, Anyang: 500, Anchen: 500, Mummy: 500, Daddy: 500, Randalls: 500, Fran: 300 },
  },
];

export function getTotalBalance(): number {
  return monthlyRecords.reduce((sum, record) => {
    return sum + Object.values(record.contributions).reduce((s, v) => s + v, 0);
  }, 0);
}

export function getMemberTotal(name: string): number {
  return monthlyRecords.reduce((sum, record) => {
    return sum + (record.contributions[name] || 0);
  }, 0);
}

export function getMonthlyTotals(): { month: string; total: number; cumulative: number }[] {
  let cumulative = 0;
  return monthlyRecords.map((record) => {
    const total = Object.values(record.contributions).reduce((s, v) => s + v, 0);
    cumulative += total;
    return { month: record.month, total, cumulative };
  });
}
