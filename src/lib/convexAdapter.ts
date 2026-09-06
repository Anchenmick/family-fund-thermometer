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
    id: doc._id,
    month: formatPeriod(doc.year, doc.monthIndex),
    contributions: doc.contributions,
    withdrawal: doc.withdrawal,
    repayment: doc.repayment,
  };
}
