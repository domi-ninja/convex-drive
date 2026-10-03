import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { parse } from "yaml";
import { expect, test } from "vitest";
import { checkConfiguration } from "./audit-copy.mjs";

function fixture() {
  const config = parse(readFileSync("deploy.yml", "utf8"));
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const caddy = readFileSync(config.route_files[0].source, "utf8");
  const keys = Object.keys(parseEnv(readFileSync(".env.local.example", "utf8")));
  const env = Object.fromEntries(keys.map(key => [key, "test-value"]));
  env.SITE_URL = new URL(config.checks.smoke[0].url).origin;
  env.VITE_CONVEX_URL = env.CONVEX_SELF_HOSTED_URL = `https://api.${new URL(env.SITE_URL).hostname}`;
  env.POSTGRES_URL = `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@postgres:5432?sslmode=disable`;
  for (const key of keys.filter(key => key.startsWith("S3_STORAGE_"))) env[key] = key.toLowerCase().replaceAll("_", "-");
  return { config, pkg, caddy, env, keys };
}

test("consistent configuration passes", () => {
  const { config, pkg, caddy, env, keys } = fixture();
  expect(checkConfiguration(config, pkg, caddy, env, keys)).toEqual([]);
});

test.each(["url", "volume", "image", "route", "dashboard", "password", "unknown-key"])("rejects %s configuration drift without exposing values", kind => {
  const f = fixture();
  if (kind === "url") f.env.VITE_CONVEX_URL = "https://api.foreign.invalid";
  if (kind === "volume") f.config.services.postgres.volumes[0].source = "/data/pp/foreign/postgres";
  if (kind === "image") f.config.services.web.image = "foreign-web:latest";
  if (kind === "route") f.config.route_files[0].dest_name = "foreign.caddy";
  if (kind === "dashboard") f.caddy += "\ndash.foreign.invalid {\n}\n";
  if (kind === "password") f.env.POSTGRES_PASSWORD = "do-not-print-this-secret";
  if (kind === "unknown-key") f.env.AWS_SECRET_ACCESS_KEY = "do-not-print-this-secret";
  const errors = checkConfiguration(f.config, f.pkg, f.caddy, f.env, f.keys);
  expect(errors.length).toBeGreaterThan(0);
  expect(errors.join(" ")).not.toContain("do-not-print-this-secret");
});
