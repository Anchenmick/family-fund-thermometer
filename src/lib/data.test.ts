import { describe, expect, it } from "vitest";
import {
  calcMemberTotal,
  calcMonthContribTotal,
  calcMonthNet,
  calcMonthlyTotals,
  calcTotalBalance,
  MonthlyRecord,
} from "./data";

const jan: MonthlyRecord = {
  month: "Jan 2026",
  contributions: { Alex: 1000, Sam: 500 },
};

const feb: MonthlyRecord = {
  month: "Feb 2026",
  contributions: { Alex: 1000, Sam: 0 },
  withdrawal: 2000,
};

const mar: MonthlyRecord = {
  month: "Mar 2026",
  contributions: { Alex: 1000, Sam: 500 },
  repayment: 850,
};

describe("calcMonthContribTotal", () => {
  it("sums the contributions", () => {
    expect(calcMonthContribTotal(jan)).toBe(1500);
  });

  it("is zero when nobody contributed", () => {
    expect(calcMonthContribTotal({ month: "x", contributions: {} })).toBe(0);
  });
});

describe("calcMonthNet", () => {
  it("equals contributions when there is no movement", () => {
    expect(calcMonthNet(jan)).toBe(1500);
  });

  it("subtracts a withdrawal", () => {
    expect(calcMonthNet(feb)).toBe(1000 - 2000);
  });

  it("adds a repayment", () => {
    expect(calcMonthNet(mar)).toBe(1500 + 850);
  });
});

describe("calcTotalBalance", () => {
  it("sums the net of every month, including negatives", () => {
    expect(calcTotalBalance([jan, feb, mar])).toBe(1500 - 1000 + 2350);
  });

  it("is zero for an empty ledger", () => {
    expect(calcTotalBalance([])).toBe(0);
  });
});

describe("calcMemberTotal", () => {
  it("sums one member across months", () => {
    expect(calcMemberTotal([jan, feb, mar], "Alex")).toBe(3000);
  });

  it("treats a member absent from a month as zero", () => {
    expect(calcMemberTotal([jan, feb, mar], "Kim")).toBe(0);
  });
});

describe("calcMonthlyTotals", () => {
  it("accumulates a running balance in order", () => {
    const totals = calcMonthlyTotals([jan, feb, mar]);
    expect(totals.map((t) => t.cumulative)).toEqual([1500, 500, 2850]);
  });

  it("preserves the month labels", () => {
    const totals = calcMonthlyTotals([jan, feb]);
    expect(totals.map((t) => t.month)).toEqual(["Jan 2026", "Feb 2026"]);
  });
});
