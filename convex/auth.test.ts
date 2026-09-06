import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { requireAdmin, requireViewer } from "./lib/auth";

const modules = import.meta.glob("./**/*.ts");

const ADMIN = "atem@example.com";
const STRANGER = "someone@example.com";

async function withSettings(t: ReturnType<typeof convexTest>, overrides: Record<string, unknown>) {
  await t.run(async (ctx) =>
    ctx.db.insert("settings", {
      requireAuthForAdmin: false,
      requireAuthForViewer: false,
      adminEmails: [ADMIN],
      targetAmount: 40000,
      ...overrides,
    })
  );
}

describe("settings.get", () => {
  test("returns defaults when no settings row exists", async () => {
    const t = convexTest(schema, modules);
    const settings = await t.query(api.settings.get, {});
    expect(settings.requireAuthForAdmin).toBe(false);
    expect(settings.requireAuthForViewer).toBe(false);
    expect(settings.targetAmount).toBe(40000);
  });

  test("never exposes the admin email list", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, {});
    const settings = await t.query(api.settings.get, {});
    expect(settings).not.toHaveProperty("adminEmails");
    expect(JSON.stringify(settings)).not.toContain(ADMIN);
  });
});

describe("requireAdmin", () => {
  test("allows anonymous access while the flag is off", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForAdmin: false });
    await expect(t.run(async (ctx) => requireAdmin(ctx))).resolves.toBeNull();
  });

  test("rejects anonymous access once the flag is on", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForAdmin: true });
    await expect(t.run(async (ctx) => requireAdmin(ctx))).rejects.toThrow(/sign in/i);
  });

  test("rejects a signed in user who is not an admin", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForAdmin: true });
    const asStranger = t.withIdentity({ email: STRANGER, subject: "u2" });
    await expect(asStranger.run(async (ctx) => requireAdmin(ctx))).rejects.toThrow(/admin/i);
  });

  test("allows a listed admin", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForAdmin: true });
    const asAdmin = t.withIdentity({ email: ADMIN, subject: "u1" });
    await expect(asAdmin.run(async (ctx) => requireAdmin(ctx))).resolves.not.toBeNull();
  });

  test("matches admin emails case insensitively", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForAdmin: true });
    const asAdmin = t.withIdentity({ email: ADMIN.toUpperCase(), subject: "u1" });
    await expect(asAdmin.run(async (ctx) => requireAdmin(ctx))).resolves.not.toBeNull();
  });

  test("rejects a signed in identity with no email", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForAdmin: true });
    const noEmail = t.withIdentity({ subject: "u3" });
    await expect(noEmail.run(async (ctx) => requireAdmin(ctx))).rejects.toThrow(/admin/i);
  });
});

describe("requireViewer", () => {
  test("allows anonymous access while the flag is off", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForViewer: false });
    await expect(t.run(async (ctx) => requireViewer(ctx))).resolves.toBeNull();
  });

  test("rejects anonymous access once the flag is on", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForViewer: true });
    await expect(t.run(async (ctx) => requireViewer(ctx))).rejects.toThrow(/sign in/i);
  });

  test("admin and viewer switches are independent", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForAdmin: true, requireAuthForViewer: false });
    await expect(t.run(async (ctx) => requireViewer(ctx))).resolves.toBeNull();
    await expect(t.run(async (ctx) => requireAdmin(ctx))).rejects.toThrow();
  });

  test("accepts a signed in identity with no email", async () => {
    const t = convexTest(schema, modules);
    await withSettings(t, { requireAuthForViewer: true });
    const noEmail = t.withIdentity({ subject: "u3" });
    await expect(noEmail.run(async (ctx) => requireViewer(ctx))).resolves.not.toBeNull();
  });
});
