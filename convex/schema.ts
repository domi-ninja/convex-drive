import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  files: defineTable({
    name: v.string(),
    type: v.string(),
    storageId: v.id("_storage"),
    userId: v.id("users"),
    size: v.number(), // Add size field
  })
    .index("by_userId", ["userId"])
    .index("by_storageId", ["storageId"]), // Index for querying by storageId
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
