import { query } from "./_generated/server";
import { getSettings } from "./lib/auth";

/**
 * Public. Returns only what the browser needs to render.
 * adminEmails is deliberately excluded so that a public page cannot
 * enumerate who the admins are.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const settings = await getSettings(ctx);
    return {
      requireAuthForAdmin: settings.requireAuthForAdmin,
      requireAuthForViewer: settings.requireAuthForViewer,
      targetAmount: settings.targetAmount,
    };
  },
});
