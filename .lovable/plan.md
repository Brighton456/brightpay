# Admin Financial Controls + Developer AI

Large scope, so I'll ship it in 4 phases. Each phase is independently testable.

---

## Phase 1 — Database foundation

**New tables**
- `admin_wallets` — 4 rows: `platform`, `swiftwallet`, `makamesco`, `mpay`. Columns: `kind`, `balance`, `archived_balance`.
- `provider_fees` — one row per provider: `provider`, `deposit_cost_pct`, `deposit_fee_pct`, `withdrawal_cost_pct`, `withdrawal_fee_pct`. Seeded with:
  - SwiftWallet: keeps current tier logic (fallback)
  - M-Pay: 10% cost / 15% fee both sides
  - Makamesco: deposit 0% cost / 10% fee, withdrawal 8% cost / 15% fee
- `admin_audit_log` — every dev-AI action: `actor`, `action`, `payload`, `result`, `reverted_at`.
- `archive_snapshots` — id, `created_by`, `archived_at`, `restored_at`, `wallet_totals jsonb`, `tx_count`, `note`.

**Mutations**
- Add `archived_at timestamptz` to `transactions` and `wallets`. Non-null = hidden from active views.
- `transactions.profit_allocated boolean` to avoid double-crediting.

**RPCs (SECURITY DEFINER, admin-only)**
- `admin_archive_all(note)` — snapshot current totals, set `archived_at=now()` on all txs + wallets, zero user balances, zero admin wallets.
- `admin_unarchive(snapshot_id)` — restore archived rows (clear `archived_at`), recompute balances from snapshot deltas.
- `admin_allocate_profit(tx_id)` — used by `finalize.ts`; credits the right admin wallet `(fee - cost)`.
- `admin_withdraw_from_wallet(kind, amount, phone)` — debits one of the 4 admin wallets.

**Frontend views**
- `active_transactions` / `active_wallets` views filtering `archived_at IS NULL`. AuthContext + Transactions page read from these.

---

## Phase 2 — Provider fee integration

- Update `supabase/functions/_shared/finalize.ts` to:
  1. Look up `provider_fees` for the tx's provider
  2. Compute `cost = amount * cost_pct`, `fee = amount * fee_pct`, `profit = fee - cost`
  3. Call `admin_allocate_profit` to credit the matching admin wallet
- Update fee preview on Deposit/Withdraw pages to use provider_fees when a non-SwiftWallet provider is selected.

---

## Phase 3 — Admin UI (AdminPanel.tsx)

New tabs/sections:
- **Profit Wallets** — 4 cards showing balance + withdraw button per wallet.
- **Provider Fees** — editable table: provider × (deposit cost/fee, withdrawal cost/fee).
- **Archive & Reset** — big red button with confirmation modal ("type ARCHIVE to confirm"). Shows list of past snapshots with "Restore" button each.

---

## Phase 4 — Developer AI

**Honest scope:** the AI cannot edit your Lovable source code or redeploy. It **can**:
- Read DB tables, edge function logs, recent errors, transaction history
- Explain bugs with step-by-step reasoning + code examples
- Execute pre-approved safe actions: refund tx, flag/unflag user, adjust a wallet balance, toggle endpoint
- Every action shows a confirmation modal → logs to `admin_audit_log` → has a "Revert" button
- Three response modes: **Concise** / **Walkthrough** / **Lesson** (user toggles)

**Build**
- New edge function `dev-ai` using Lovable AI Gateway (`google/gemini-2.5-pro`) with tools:
  - `query_db(sql)` — SELECT only, parsed/validated
  - `read_logs(function_name, limit)`
  - `propose_action(kind, params)` — returns a confirmation token; admin clicks Approve → second call executes
  - `revert_action(audit_id)`
- New `AdminDevAI.tsx` chat component embedded in admin panel. Markdown + code blocks + tool-call cards.

**Safety guards**
- Only `admin` role can invoke
- SELECT-only SQL whitelist (no DDL/DML)
- Mutating tools always require explicit user approval before execution
- Full audit trail with diff

---

## Technical notes

- Voice input and IDE integration: not feasible inside the running app — flagging now. I'll add a placeholder mic icon that uses the browser Web Speech API (works on Chrome/Edge only) for voice queries.
- "Visual diagrams" → rendered as mermaid in markdown when AI returns them.
- Granular permissions (plan/build): added as a toggle in dev AI sidebar — `plan` mode disables `propose_action`.

---

## Ship order

1. Migration (Phase 1) → wait for approval
2. finalize.ts + fee UI (Phase 2)
3. Admin UI sections (Phase 3)
4. Dev AI edge function + chat UI (Phase 4)

Approve and I'll start with the migration.