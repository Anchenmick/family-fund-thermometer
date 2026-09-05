import { describe, expect, it } from "vitest";
import { ConvexError } from "convex/values";
import { extractErrorMessage } from "./convexErrors";

describe("extractErrorMessage", () => {
  it("returns the data payload for a ConvexError", () => {
    const error = new ConvexError("That month already exists. Edit it instead of adding it again.");
    expect(extractErrorMessage(error)).toBe(
      "That month already exists. Edit it instead of adding it again."
    );
  });

  it("returns the message for an ordinary Error", () => {
    const error = new Error("Network request failed");
    expect(extractErrorMessage(error)).toBe("Network request failed");
  });

  it("returns a generic fallback for a non-Error value", () => {
    expect(extractErrorMessage("just a string")).toBe("Unknown error");
    expect(extractErrorMessage(undefined)).toBe("Unknown error");
    expect(extractErrorMessage({ some: "object" })).toBe("Unknown error");
  });
});
