import { describe, expect, it } from "vitest";
import { docToRecord, LedgerDoc } from "./convexAdapter";
import { calcMonthNet } from "./data";

const doc: LedgerDoc = {
  _id: "abc123",
  year: 2026,
  monthIndex: 3,
  contributions: { Atem: 0, Anyang: 0 },
  withdrawal: 0,
  repayment: 0,
};

describe("docToRecord", () => {
  it("derives the display label from the period", () => {
    expect(docToRecord(doc).month).toBe("Apr 2026");
  });

  it("carries the contributions through unchanged", () => {
    expect(docToRecord(doc).contributions).toEqual({ Atem: 0, Anyang: 0 });
  });

  it("carries withdrawal and repayment through", () => {
    const record = docToRecord(doc);
    expect(record.withdrawal).toBe(0);
    expect(record.repayment).toBe(0);
  });

  it("produces a record the existing calculations accept", () => {
    expect(calcMonthNet(docToRecord(doc))).toBe(0 - 0);
  });
});
