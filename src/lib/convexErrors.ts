import { ConvexError } from "convex/values";

/**
 * Extracts a human readable message from an error thrown by a Convex
 * mutation. Convex mutations in this app throw ConvexError with a plain
 * string payload written for a non-technical reader. On the client,
 * `.message` on a ConvexError is a diagnostic wrapper (stack trace style
 * text), not that clean sentence. The clean sentence lives in `.data`.
 *
 * Falls back to `.message` for ordinary errors, and to a generic string
 * for anything else.
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    return String(error.data);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}
