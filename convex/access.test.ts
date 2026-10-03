/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "./_generated/*.js", "!./**/*.test.ts"]);

async function setup() {
  const t = convexTest(schema, modules);
  const [alice, bob] = await t.run(async ctx => Promise.all([
    ctx.db.insert("users", { name: "Alice" }),
    ctx.db.insert("users", { name: "Bob" }),
  ]));
  const owner = t.withIdentity({ subject: `${alice}|session` });
  const stranger = t.withIdentity({ subject: `${bob}|session` });
  const root = await owner.mutation(api.folders.ensureRootFolder, {});
  const child = await owner.mutation(api.folders.saveFolder, { name: "Private", type: "folder", size: 0, folderId: root });
  await t.run(async ctx => {
    const storageId = await ctx.storage.store(new Blob(["private content"]));
    await ctx.db.insert("files", { name: "secret", type: "text/plain", extension: "txt", storageId, size: 15, userId: alice, folderId: child });
  });
  return { t, owner, stranger, root, child };
}

test("anonymous callers and other users cannot read a known folder ID or obtain its URLs", async () => {
  const { t, stranger, root, child } = await setup();
  for (const caller of [t, stranger]) {
    await expect(caller.query(api.folders.getFolder, { folderId: child })).rejects.toThrow();
    await expect(caller.query(api.folders.getFolderPathRec, { folderId: child })).rejects.toThrow();
    await expect(caller.query(api.folders.getFilesAndFoldersRec, { folderId: root })).rejects.toThrow();
    await expect(caller.query(api.folders.findFolderByName, { parentFolderId: root, name: "Private" })).rejects.toThrow();
    await expect(caller.query(api.folders.resolveFolderPath, { rootFolderId: root, path: "/" })).rejects.toThrow();
    await expect(caller.query(api.folders.getFolderPath, { rootFolderId: root, folderId: root })).rejects.toThrow();
    await expect(caller.action(api.fileActions.downloadFilesAsZipBytes, { filesOrFolders: [{ type: "folder", _id: root, name: "Root" }] })).rejects.toThrow();
  }
});

test("owners can browse, resolve paths, and create only their own root", async () => {
  const { owner, stranger, root, child } = await setup();
  expect(await owner.mutation(api.folders.ensureRootFolder, {})).toBe(root);
  expect(await stranger.mutation(api.folders.ensureRootFolder, {})).not.toBe(root);
  expect(await owner.query(api.folders.resolveFolderPath, { rootFolderId: root, path: "Private" })).toBe(child);
  expect(await owner.query(api.folders.getFolderPath, { rootFolderId: root, folderId: child })).toBe("/Private");
  const tree = await owner.query(api.folders.getFilesAndFoldersRec, { folderId: root });
  expect(tree.folders[0].files[0].name).toBe("secret");
  expect(tree.folders[0].files[0].url).toBeTruthy();
});

test("anonymous callers cannot create roots or upload URLs", async () => {
  const { t, owner } = await setup();
  await expect(t.mutation(api.folders.ensureRootFolder, {})).rejects.toThrow("not authenticated");
  await expect(t.mutation(api.files.generateFileUploadUrl, {})).rejects.toThrow("not authenticated");
  expect(await owner.mutation(api.files.generateFileUploadUrl, {})).toBeTruthy();
});

test("moving a folder into itself or a descendant is rejected", async () => {
  const { owner, root, child } = await setup();
  await expect(owner.mutation(api.folders.moveFolder, { folderId: root, targetFolderId: root })).rejects.toThrow();
  await expect(owner.mutation(api.folders.moveFolder, { folderId: root, targetFolderId: child })).rejects.toThrow();
});
