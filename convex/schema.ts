import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  files: defineTable({
    name: v.string(),
    type: v.string(),
    storageId: v.id("_storage"),
    userId: v.id("users"),
    size: v.number(), // Add size field
    extension: v.optional(v.string()),
    folderId: v.id("folders"),
  })
    .index("by_userId", ["userId"])
    .index("by_folderId", ["folderId"])
    .index("by_storageId", ["storageId"]), // Index for querying by storageId

  folders: defineTable({
    name: v.string(),
    userId: v.id("users"),
    size: v.number(), // Add size field
    folderId: v.optional(v.id("folders")),
  })
    .index("by_userId", ["userId"])
    .index("by_folderId", ["folderId"])
    .index("by_userAndName", ["userId", "name"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
