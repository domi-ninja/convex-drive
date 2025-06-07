import { v } from "convex/values";
import { action } from "./_generated/server";

export const getEnvironmentUrls = action({
    args: {},
    returns: v.object({
        CONVEX_CLOUD_URL: v.string(),
        CONVEX_SITE_URL: v.string(),
    }),
    handler: async () => {
        return {
            CONVEX_CLOUD_URL: process.env.CONVEX_CLOUD_URL ?? "",
            CONVEX_SITE_URL: process.env.CONVEX_SITE_URL ?? "",
        };
    },
});
