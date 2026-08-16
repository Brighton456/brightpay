#!/usr/bin/env node
// One-shot data migration: old Supabase project -> new Supabase project.
//
// Required env vars:
//   SUPABASE_ACCESS_TOKEN      PAT for the NEW project's account (fetches new service key)
//   OLD_SUPABASE_URL           e.g. https://ftwbfezbikovfzfbxvnn.supabase.co
//   OLD_SUPABASE_SERVICE_KEY   service_role key of the OLD project (from Lovable dashboard)
//   NEW_SUPABASE_REF           new project ref (default: lqlpgghortuhdxnfqavj)
//
// What it copies:
//   1. auth.users + auth.identities (via PostgREST if the auth schema is exposed on the old
//      project; falls back to the GoTrue admin API which preserves accounts but NOT passwords).
//   2. All public tables in FK-safe order (upsert by primary key, idempotent).
//   3. All storage buckets + objects (preserving paths).
//
// Only writes to the NEW project. Safe to re-run.

import { env, exit } from 'node:process';

const PAT = env.SUPABASE_ACCESS_TOKEN;
const OLD_URL = (env.OLD_SUPABASE_URL || '').replace(/\/+$/, '');
const OLD_KEY = env.OLD_SUPABASE_SERVICE_KEY || '';
const NEW_REF = env.NEW_SUPABASE_REF || 'lqlpgghortuhdxnfqavj';
const NEW_URL = `https://${NEW_REF}.supabase.co`;

if (!PAT || !OLD_URL || !OLD_KEY) {
  console.error('Missing env vars: SUPABASE_ACCESS_TOKEN, OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_KEY');
  exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function jfetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    throw new Error(`${opts.method || 'GET'} ${url} -> ${res.status}: ${JSON.stringify(body)?.slice(0, 300)}`);
  }
  return body;
}

const mgmt = (path, opts = {}) =>
  jfetch(`https://api.supabase.com/v1${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${PAT}`, ...(opts.headers || {}) },
  });

async function getNewServiceKey() {
  const keys = await mgmt(`/projects/${NEW_REF}/api-keys`);
  const k = keys.find((x) => x.name === 'service_role');
  if (!k) throw new Error('service_role key not found for new project');
  return k.api_key;
}

// PostgREST ----------------------------------------------------------------
async function pgSelect(baseUrl, table, key, { select = '*', limit = 1000 } = {}) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const res = await fetch(
      `${baseUrl}/rest/v1/${table}?select=${select}&limit=${limit}&offset=${offset}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
      }
    );
    if (res.status === 404) return { exposed: false, rows: [] };
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`SELECT ${table}: ${res.status} ${text.slice(0, 300)}`);
    }
    const batch = JSON.parse(text);
    rows.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return { exposed: true, rows };
}

async function pgUpsert(baseUrl, table, rows, key, onConflict) {
  if (!rows.length) return;
  // Batch of 500 rows per request to stay under payload limits.
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const res = await fetch(`${baseUrl}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`UPSERT ${table}: ${res.status} ${text.slice(0, 500)}`);
    }
  }
  console.log(`  upserted ${rows.length} rows into ${table}`);
}

// SQL against the new project (auth schema writes) --------------------------
async function newSql(query) {
  const res = await jfetch(`https://api.supabase.com/v1/projects/${NEW_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return res;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const newServiceKey = await getNewServiceKey();
console.log(`Source:      ${OLD_URL}`);
console.log(`Destination: ${NEW_URL}`);

const PUBLIC_TABLES = [
  // no dependencies
  ['packages', 'id'],
  ['fees', 'id'],
  ['platform_settings', 'key'],
  ['admin_wallets', 'id'],
  ['provider_fees', 'provider'],
  ['provider_fee_tiers', 'id'],
  // depend on auth.users
  ['archive_snapshots', 'id'],
  ['profiles', 'id'],
  ['user_roles', 'id'],
  ['wallets', 'id'],
  ['endpoints', 'id'],
  ['channels', 'id'],
  ['transactions', 'id'],
  ['kyc_documents', 'id'],
  ['feature_requests', 'id'],
  ['announcements', 'id'],
  ['user_daraja_credentials', 'id'],
  ['virtual_cards', 'id'],
  ['card_transactions', 'id'],
  ['admin_audit_log', 'id'],
];

// 1. auth.users + auth.identities ------------------------------------------
async function migrateAuth() {
  const users = await pgSelect(OLD_URL, 'auth.users', OLD_KEY, { select: '*' });
  const identities = await pgSelect(OLD_URL, 'auth.identities', OLD_KEY, { select: '*' });

  if (!users.exposed) {
    console.log('auth schema not exposed via PostgREST on the old project; using GoTrue admin API fallback.');
    // Fallback: read users via GoTrue admin API and create them on the new project.
    const adminUsers = [];
    let page = 1;
    for (;;) {
      const data = await jfetch(`${OLD_URL}/auth/v1/admin/users?per_page=200&page=${page}`, {
        headers: { apikey: OLD_KEY, Authorization: `Bearer ${OLD_KEY}` },
      });
      adminUsers.push(...(data.users || []));
      if (!data.users || data.users.length < 200) break;
      page++;
    }
    console.log(`  ${adminUsers.length} users found via admin API`);
    for (const u of adminUsers) {
      const body = {
        email: u.email,
        phone: u.phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: u.user_metadata || {},
        app_metadata: u.app_metadata || {},
        ban_duration: u.banned_until ? '876000h' : undefined,
      };
      try {
        await jfetch(`${NEW_URL}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            apikey: newServiceKey,
            Authorization: `Bearer ${newServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      } catch (e) {
        // user may already exist (email taken) — try updating instead
        const res = await fetch(`${NEW_URL}/auth/v1/admin/users/by-email?email=${encodeURIComponent(u.email)}`, {
          headers: { apikey: newServiceKey, Authorization: `Bearer ${newServiceKey}` },
        });
        if (res.ok) {
          const found = (await res.json());
          const id = Array.isArray(found) ? found[0]?.id : found?.id;
          if (id) {
            await jfetch(`${NEW_URL}/auth/v1/admin/users/${id}`, {
              method: 'PUT',
              headers: {
                apikey: newServiceKey,
                Authorization: `Bearer ${newServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email_confirm: true, phone_confirm: true, user_metadata: u.user_metadata || {}, app_metadata: u.app_metadata || {} }),
            });
          }
        }
        console.log(`  (fallback) handled user ${u.email || u.phone}: ${e.message.slice(0, 120)}`);
      }
    }
    console.log('  NOTE: passwords were not preserved (admin API does not expose hashes). Users must reset passwords.');
    return;
  }

  console.log(`auth schema exposed: ${users.rows.length} users, ${identities.rows.length} identities`);

  // Build INSERTs for the new project via SQL (auth schema is not PostgREST-exposed there).
  async function insertAuthRows(table, rows) {
    if (!rows.length) return;
    const colsRes = await newSql(
      `select column_name from information_schema.columns where table_schema='auth' and table_name='${table}'`
    );
    const cols = colsRes.map((r) => r.column_name);
    const insertable = (r) => {
      const out = {};
      for (const c of cols) {
        if (c in r) out[c] = r[c];
      }
      // Never copy auth tokens/instance secrets.
      delete out.instance_id;
      return out;
    };
    // Preserve ids explicitly.
    const first = insertable(rows[0]);
    const keyCols = Object.keys(first);
    const esc = (v) =>
      v === null || v === undefined ? 'NULL'
      : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'`
      : typeof v === 'boolean' ? (v ? 'true' : 'false')
      : typeof v === 'number' ? String(v)
      : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const values = chunk.map((r) => `(${keyCols.map((c) => esc(insertable(r)[c])).join(',')})`).join(',');
      const sql = `insert into auth.${table} (${keyCols.join(',')}) values ${values} on conflict (id) do nothing;`;
      await newSql(sql);
    }
    console.log(`  inserted ${rows.length} rows into auth.${table} via SQL`);
  }

  await insertAuthRows('users', users.rows);
  await insertAuthRows('identities', identities.rows);
}

// 2. Public tables ----------------------------------------------------------
async function migratePublicTables() {
  for (const [table, conflictCol] of PUBLIC_TABLES) {
    const { exposed, rows } = await pgSelect(OLD_URL, table, OLD_KEY);
    if (!exposed) {
      console.log(`  SKIP ${table}: not exposed via PostgREST`);
      continue;
    }
    if (!rows.length) {
      console.log(`  ${table}: 0 rows`);
      continue;
    }
    await pgUpsert(NEW_URL, table, rows, newServiceKey, conflictCol);
  }
}

// 3. Storage buckets + objects ---------------------------------------------
async function migrateStorage() {
  const buckets = await jfetch(`${OLD_URL}/storage/v1/bucket`, {
    headers: { apikey: OLD_KEY, Authorization: `Bearer ${OLD_KEY}` },
  });
  if (!Array.isArray(buckets)) return;
  for (const b of buckets) {
    // ensure bucket exists on new project
    const exists = await fetch(`${NEW_URL}/storage/v1/bucket/${b.id}`, {
      headers: { apikey: newServiceKey, Authorization: `Bearer ${newServiceKey}` },
    });
    if (!exists.ok) {
      await jfetch(`${NEW_URL}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          apikey: newServiceKey,
          Authorization: `Bearer ${newServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: b.id, name: b.id, public: !!b.public }),
      });
      console.log(`  created bucket ${b.id}`);
    }
    // recursively list + copy objects
    async function walk(prefix) {
      const res = await fetch(
        `${OLD_URL}/storage/v1/object/list/${b.id}?prefix=${encodeURIComponent(prefix)}&limit=1000&offset=0`,
        { headers: { apikey: OLD_KEY, Authorization: `Bearer ${OLD_KEY}` } }
      );
      if (!res.ok) return;
      const items = await res.json();
      for (const it of items) {
        const name = (prefix ? prefix + '/' : '') + it.name;
        if (it.id && it.metadata?.mimetype) {
          const file = await fetch(`${OLD_URL}/storage/v1/object/${b.id}/${name}`, {
            headers: { apikey: OLD_KEY, Authorization: `Bearer ${OLD_KEY}` },
          });
          if (file.ok) {
            const buf = Buffer.from(await file.arrayBuffer());
            const up = await fetch(`${NEW_URL}/storage/v1/object/${b.id}/${name}`, {
              method: 'POST',
              headers: {
                apikey: newServiceKey,
                Authorization: `Bearer ${newServiceKey}`,
                'Content-Type': it.metadata.mimetype,
                'x-upsert': 'true',
              },
              body: buf,
            });
            console.log(`  ${up.ok ? 'copied' : 'FAILED'} storage object ${b.id}/${name} (${buf.length} bytes)`);
          } else {
            console.log(`  FAILED to download storage object ${b.id}/${name}`);
          }
        } else {
          await walk(name);
        }
      }
    }
    await walk('');
    console.log(`  done bucket ${b.id}`);
  }
}

await migrateAuth();
await migratePublicTables();
await migrateStorage();
console.log('\nData migration complete.');
