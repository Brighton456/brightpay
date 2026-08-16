#!/usr/bin/env node
// Applies supabase/migrations/*.sql in filename order to a remote Supabase project
// using the Management API query endpoint.
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=sbp_xxx SUPABASE_PROJECT_REF=abcdefghijklmnopqrst node scripts/apply-migrations.mjs [startFilename]
//
// Optional first arg = filename to resume from (inclusive). Stops on first hard failure.
// Includes a per-request timeout and one retry for transient errors.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || 'lqlpgghortuhdxnfqavj';
const RESUME_FROM = process.argv[2];

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN env var is required');
  process.exit(1);
}

const dir = 'supabase/migrations';
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const start = RESUME_FROM ? files.indexOf(RESUME_FROM) : 0;
if (start === -1) {
  console.error(`Resume file not found: ${RESUME_FROM}`);
  process.exit(1);
}

async function runQuery(sql) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

for (let i = start; i < files.length; i++) {
  const f = files[i];
  const sql = readFileSync(join(dir, f), 'utf8');
  let result = await runQuery(sql);
  // One retry on transient failures (5xx / network).
  if (!result.ok && (result.status >= 500 || result.text === '')) {
    await new Promise((r) => setTimeout(r, 3000));
    result = await runQuery(sql);
  }
  if (result.ok) {
    console.log(`OK   ${f}`);
  } else {
    console.log(`FAIL ${f}`);
    console.log(result.text.slice(0, 2000));
    process.exit(1);
  }
}
console.log('All requested migrations applied.');
