import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parseEnv } from "node:util";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "yaml";

// Return key names and configuration errors only. Never include secret values.
export function checkConfiguration(config, pkg, caddy, env, schemaKeys) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  const project = config.project.name;
  check(/^[a-z0-9][a-z0-9-]*$/.test(project), "Invalid literal project.name");
  check(pkg.name === project, "package.json name differs from project.name");
  for (const [name, build] of Object.entries(config.builds)) {
    check(build.tags.every(tag => tag === `${project}-${name}:\${release}`), `Build ${name} has a foreign image tag`);
  }
  for (const [name, service] of Object.entries(config.services)) {
    if (service.build) check(service.image === `${project}-${service.build}:\${release}`, `Service ${name} has a foreign image`);
    for (const volume of service.volumes ?? []) {
      check(volume.source === `/data/pp/${project}/${name}`, `Service ${name} has a foreign data path`);
    }
  }
  check(config.route_files.length === 1 && config.route_files[0].dest_name === `${project}.caddy`, "Route destination differs from project.name");
  check(Object.keys(config.hosts).length === 1, "Copy workflow requires one deploy host");
  const frontend = config.checks.smoke.find(check => check.name === "frontend");
  let site;
  try { site = new URL(frontend.url); } catch { errors.push("Invalid frontend smoke URL"); return errors; }
  check(site.protocol === "https:" && site.pathname === "/" && !site.port && !site.username && !site.password && !site.search && !site.hash, "Frontend smoke URL must be an HTTPS site origin");
  const origin = site.origin;
  const api = `https://api.${site.hostname}`;
  const hosts = [...caddy.matchAll(/^([a-z0-9.-]+)\s*\{/gm)].map(match => match[1]).sort();
  check(JSON.stringify(hosts) === JSON.stringify([site.hostname, `api.${site.hostname}`, `www.${site.hostname}`].sort()), "Caddy hostnames must match site, api, and www only");
  const caddyOrigins = [...caddy.matchAll(/https:\/\/([a-z0-9.-]+)/g)].map(match => match[1]);
  check(caddyOrigins.length > 0 && caddyOrigins.every(host => host === site.hostname), "Caddy redirect/CORS origins differ from site hostname");
  check(config.checks.smoke.find(check => check.name === "convex version")?.url === `${api}/version`, "API smoke URL differs from derived hostname");
  for (const name of ["convex-backend", "convex-dashboard"]) {
    const values = config.services[name].environment;
    for (const key of ["CONVEX_CLOUD_ORIGIN", "CONVEX_SITE_ORIGIN", ...(name === "convex-dashboard" ? ["NEXT_PUBLIC_DEPLOYMENT_URL"] : [])]) {
      check(values[key] === "${env.CONVEX_SELF_HOSTED_URL}", `${name}.${key} must use the canonical API URL`);
    }
  }
  check(config.services["convex-backend"].environment.AWS_ACCESS_KEY_ID === "${env.MINIO_ROOT_USER}", "Backend S3 user must use MinIO credentials");
  check(config.services["convex-backend"].environment.AWS_SECRET_ACCESS_KEY === "${env.MINIO_ROOT_PASSWORD}", "Backend S3 password must use MinIO credentials");
  const referencedKeys = [...JSON.stringify(config).matchAll(/\$\{env\.([A-Z_0-9]+)\}/g)].map(match => match[1]);
  for (const key of new Set(referencedKeys)) check(schemaKeys.includes(key), `Deployment references undocumented key ${key}`);
  if (!env) return errors;
  for (const key of schemaKeys) check(Boolean(env[key]) && !env[key].includes("<"), `Environment key ${key} is missing or a placeholder`);
  for (const key of Object.keys(env)) check([...schemaKeys, "CONVEX_SELF_HOSTED_ADMIN_KEY", "VITE_CONVEX_SITE_URL"].includes(key), `Unowned environment key ${key}`);
  check(env.SITE_URL === origin, "SITE_URL differs from deployment site hostname");
  check(env.VITE_CONVEX_URL === api && env.CONVEX_SELF_HOSTED_URL === api, "API environment URLs differ from derived hostname");
  if (env.VITE_CONVEX_SITE_URL) check(env.VITE_CONVEX_SITE_URL === api, "CLI-generated site URL differs from API hostname");
  check(env.POSTGRES_URL === `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@postgres:5432?sslmode=disable`, "POSTGRES_URL disagrees with generated Postgres credentials");
  const buckets = Object.entries(env).filter(([key]) => /^S3_STORAGE_.*_BUCKET$/.test(key)).map(([, value]) => value);
  check(new Set(buckets).size === 5 && buckets.every(value => /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value)), "Storage requires five distinct valid bucket names");
  return errors;
}

export function audit({ root = process.cwd(), envFile = ".env.local", configurationOnly = false } = {}) {
  const read = file => readFileSync(resolve(root, file), "utf8");
  const config = parse(read("deploy.yml"));
  const pkg = JSON.parse(read("package.json"));
  const schemaKeys = Object.keys(parseEnv(read(".env.local.example")));
  const envPath = resolve(root, envFile);
  const envText = existsSync(envPath) ? readFileSync(envPath, "utf8") : undefined;
  const env = envText === undefined ? undefined : parseEnv(envText);
  const errors = checkConfiguration(config, pkg, read(config.route_files[0].source), env, schemaKeys);
  if (envText !== undefined) {
    if ((statSync(envPath).mode & 0o777) !== 0o600) errors.push("Environment file must have mode 0600");
    const keys = [...envText.matchAll(/^([A-Z_0-9]+)=/gm)].map(match => match[1]);
    if (new Set(keys).size !== keys.length) errors.push("Environment contains duplicate keys");
  }
  const statePath = resolve(root, ".deploy/state.json");
  if (existsSync(statePath)) {
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    if (state.project !== config.project.name) errors.push("Deployment state belongs to a different project");
  }
  const uploadScript = read("scripts/push-.env.local-to-convex.sh");
  if (!uploadScript.includes("FUNCTION_ENV=(SITE_URL JWT_PRIVATE_KEY JWKS)")) errors.push("Unexpected Convex function environment allowlist");
  if (!configurationOnly) {
    const remotes = execFileSync("git", ["remote", "-v"], { cwd: root, encoding: "utf8" });
    if (!remotes.trim()) errors.push("Configure the copied repository's Git remote");
    if (/convex-drive|image-zero|drive\.humanist\.design/.test(remotes)) errors.push("Git remotes still point at a source repository; supply the new repository URL");
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let envFile = ".env.local";
  let configurationOnly = false;
  const args = process.argv.slice(2);
  while (args.length) {
    const arg = args.shift();
    if (arg === "--configuration-only") configurationOnly = true;
    else if (arg === "--env-file" && args.length) envFile = args.shift();
    else throw new Error("Usage: audit-copy.sh [--configuration-only] [--env-file path]");
  }
  try {
    const errors = audit({ envFile, configurationOnly });
    for (const error of errors) console.error(`FAIL: ${error}`);
    process.exitCode = errors.length ? 1 : 0;
    if (!errors.length) console.log(configurationOnly ? "Configuration checks passed; Git remotes were not checked." : "Copy and environment checks passed.");
  } catch {
    console.error("FAIL: could not parse the repository configuration. No environment values were printed.");
    process.exitCode = 1;
  }
}
