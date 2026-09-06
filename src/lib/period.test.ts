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
