import { describe, expect, it } from "vitest";
import { isClerkConfigured } from "./clerkConfig";

describe("isClerkConfigured", () => {
  it("is false when the key is missing", () => {
    expect(isClerkConfigured(undefined)).toBe(false);
  });

  it("is false when the key is an empty string", () => {
    expect(isClerkConfigured("")).toBe(false);
  });

  it("is false when the key is only whitespace", () => {
    expect(isClerkConfigured("   ")).toBe(false);
  });

  it("is true for a real publishable key", () => {
    expect(isClerkConfigured("pk_test_abc123")).toBe(true);
  });
});
