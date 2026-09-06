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
