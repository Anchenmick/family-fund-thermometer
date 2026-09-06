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
