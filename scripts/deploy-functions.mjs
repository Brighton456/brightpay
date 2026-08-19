// Deploy all edge functions to a Supabase project via the Management API.
// - Inlines ../_shared/*.ts modules (they have no imports) so each function
//   uploads as a single self-contained index.ts.
// - Requires SUPABASE_ACCESS_TOKEN env var. Project ref passed as argv[2] or
//   SUPABASE_PROJECT_REF env var.
//
// Usage: node scripts/deploy-functions.mjs <project-ref>

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.argv[2] || process.env.SUPABASE_PROJECT_REF;
if (!TOKEN || !REF) {
  console.error("Usage: SUPABASE_ACCESS_TOKEN=... node scripts/deploy-functions.mjs <project-ref>");
  process.exit(1);
}

const SHARED_DIR = join(ROOT, "supabase", "functions", "_shared");

// slug -> { verify_jwt }
// verify_jwt=true: called by the app with a user JWT (supabase.functions.invoke)
// verify_jwt=false: provider webhooks / merchant API endpoints (x-api-key auth)
const FUNCTIONS = {
  "admin-action": { verify_jwt: true },
  "b2c-withdraw": { verify_jwt: true },
  "brightpay-ai": { verify_jwt: true },
  "card-action": { verify_jwt: true },
  "card-create": { verify_jwt: true },
  "daraja-b2c-result": { verify_jwt: false },
  "daraja-c2b-callback": { verify_jwt: false },
  "daraja-save-credentials": { verify_jwt: true },
  "daraja-stk-callback": { verify_jwt: false },
  "daraja-test": { verify_jwt: true },
  "dev-ai": { verify_jwt: true },
  "endpoint-account": { verify_jwt: false },
  "endpoint-pay": { verify_jwt: false },
  "endpoint-status": { verify_jwt: false },
  "endpoint-withdraw": { verify_jwt: false },
  "flw-webhook": { verify_jwt: false },
  "makamesco-poll": { verify_jwt: true },
  "makamesco-webhook": { verify_jwt: false },
  "mpay-callback": { verify_jwt: false },
  "stk-push": { verify_jwt: true },
  "swiftwallet-callback": { verify_jwt: false },
  "welcome-email": { verify_jwt: false },
};

const BUILD_DIR = join(ROOT, "scripts", ".build");
rmSync(BUILD_DIR, { recursive: true, force: true });
mkdirSync(BUILD_DIR, { recursive: true });

function inlineShared(src) {
  return src.replace(/import\s+[^;]+from\s+"\.\.\/_shared\/([A-Za-z0-9_-]+)\.ts"\s*;/g, (_m, name) => {
    const sharedSrc = readFileSync(join(SHARED_DIR, `${name}.ts`), "utf8");
    // Turn module exports into plain declarations so the file stays a single script.
    return sharedSrc.replace(/^export\s+/gm, "");
  });
}

async function deploy(slug, opts) {
  const dir = join(ROOT, "supabase", "functions", slug);
  const raw = readFileSync(join(dir, "index.ts"), "utf8");
  const bundled = inlineShared(raw);
  const outDir = join(BUILD_DIR, slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.ts"), bundled);

  const form = new FormData();
  form.append("file", new Blob([bundled], { type: "text/typescript" }), "index.ts");
  form.append(
    "metadata",
    JSON.stringify({
      entrypoint_path: "index.ts",
      verify_jwt: opts.verify_jwt,
      name: slug,
    }),
  );

  const url = `https://api.supabase.com/v1/projects/${REF}/functions/deploy?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${slug}: HTTP ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

let ok = 0;
const failures = [];
for (const [slug, opts] of Object.entries(FUNCTIONS)) {
  process.stdout.write(`deploying ${slug} ... `);
  try {
    const r = await deploy(slug, opts);
    ok++;
    console.log(`OK (version ${r.version}, verify_jwt=${r.verify_jwt})`);
  } catch (e) {
    failures.push(slug);
    console.log(`FAILED: ${e.message}`);
  }
}

console.log(`\n${ok}/${Object.keys(FUNCTIONS).length} deployed.`);
if (failures.length) console.log("Failures:", failures.join(", "));
process.exit(failures.length ? 1 : 0);
