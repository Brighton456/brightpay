// Set edge function secrets on a Supabase project.
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=... node scripts/set-secrets.mjs <project-ref> KEY1=value1 KEY2=value2 ...
//
// Values may reference env vars: FLW_SECRET_KEY=$FLW_SECRET_KEY (passed through
// the shell) or be given literally. Only keys in ALLOWED are accepted, so
// typos / accidental secrets don't leak into the project.

import { argv } from "node:process";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = argv[2];
if (!TOKEN || !REF) {
  console.error("Usage: SUPABASE_ACCESS_TOKEN=... node scripts/set-secrets.mjs <project-ref> KEY=value ...");
  process.exit(1);
}

const ALLOWED = new Set([
  "SWIFTWALLET_API_KEY",
  "SWIFTWALLET_CHANNEL_ID",
  "SWIFTWALLET_CALLBACK_SECRET",
  "MAKAMESCO_API_KEY",
  "MAKAMESCO_BASE_URL",
  "MAKAMESCO_WEBHOOK_SECRET",
  "MPAY_API_KEY",
  "FLW_SECRET_KEY",
  "FLW_WEBHOOK_HASH",
  "DARAJA_ENC_KEY",
  "LOVABLE_API_KEY",
]);

const pairs = argv.slice(3);
if (!pairs.length) {
  console.error("No KEY=value pairs provided.");
  process.exit(1);
}

const secrets = [];
for (const pair of pairs) {
  const eq = pair.indexOf("=");
  const name = eq === -1 ? pair : pair.slice(0, eq);
  const value = eq === -1 ? "" : pair.slice(eq + 1);
  if (!ALLOWED.has(name)) {
    console.error(`Skipping ${name}: not in the allow-list (allowed: ${[...ALLOWED].join(", ")})`);
    continue;
  }
  if (!value) {
    console.error(`Skipping ${name}: empty value`);
    continue;
  }
  secrets.push({ name, value });
}

if (!secrets.length) {
  console.error("Nothing to set.");
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/secrets`, {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify(secrets),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`HTTP ${res.status}:`, JSON.stringify(body));
  process.exit(1);
}
console.log(`Set ${secrets.length} secret(s): ${secrets.map((s) => s.name).join(", ")}`);
