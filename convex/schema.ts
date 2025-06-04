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
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Custom field.
    favoriteColor: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  messages: defineTable({
    userId: v.id("users"),
    body: v.string(),
  }),
});
