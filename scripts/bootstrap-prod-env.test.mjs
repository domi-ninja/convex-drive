import { mkdtempSync, readFileSync, rmSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { parseEnv } from "node:util";
import { parse } from "yaml";
import { expect, test } from "vitest";

test("bootstrap rotates locally, preserves names, and restores the previous environment", () => {
  const directory = mkdtempSync(join(tmpdir(), "drive-bootstrap-test-"));
  const envFile = join(directory, ".env.local");
  const config = parse(readFileSync("deploy.yml", "utf8"));
  const hostname = new URL(config.checks.smoke[0].url).hostname;
  const bootstrap = host => execFileSync("bash", ["scripts/bootstrap-prod-env.sh", host, envFile], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try {
    bootstrap(hostname);
    const original = readFileSync(envFile, "utf8");
    const before = parseEnv(original);
    // Convex derives its PostgreSQL database from the instance name.
    expect(before.POSTGRES_DB === before.INSTANCE_NAME.replaceAll("-", "_")).toBe(true);
    bootstrap(hostname);
    const after = parseEnv(readFileSync(envFile, "utf8"));
    for (const key of ["INSTANCE_SECRET", "POSTGRES_PASSWORD", "MINIO_ROOT_USER", "MINIO_ROOT_PASSWORD", "JWT_PRIVATE_KEY", "JWKS"]) {
      expect(before[key] !== after[key]).toBe(true);
    }
    for (const key of ["INSTANCE_NAME", "POSTGRES_DB", "POSTGRES_USER", "S3_STORAGE_FILES_BUCKET"]) {
      expect(before[key] === after[key]).toBe(true);
    }
    expect(statSync(envFile).mode & 0o777).toBe(0o600);
    expect(statSync(`${envFile}.previous`).mode & 0o777).toBe(0o600);
    expect(() => bootstrap(hostname)).toThrow();
    bootstrap("--restore");
    expect(readFileSync(envFile, "utf8") === original).toBe(true);
    expect(existsSync(`${envFile}.previous`)).toBe(false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 15000);
