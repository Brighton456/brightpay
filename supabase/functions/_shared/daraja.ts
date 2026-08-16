// Daraja (Safaricom M-Pesa) integration helper for BrightPay.
// Credentials are stored encrypted (AES-GCM, base64) in `user_daraja_credentials`.
// Edge functions load + decrypt at call time using DARAJA_ENC_KEY.

const SANDBOX = "https://sandbox.safaricom.co.ke";
const LIVE = "https://api.safaricom.co.ke";

// ---------- crypto ----------

async function keyMaterial(): Promise<CryptoKey> {
  const raw = Deno.env.get("DARAJA_ENC_KEY") || "";
  if (!raw) throw new Error("DARAJA_ENC_KEY missing");
  const bytes = new TextEncoder().encode(raw).slice(0, 32);
  const padded = new Uint8Array(32);
  padded.set(bytes);
  return crypto.subtle.importKey("raw", padded, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return "";
  const key = await keyMaterial();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...out));
}

export async function decrypt(b64: string | null | undefined): Promise<string> {
  if (!b64) return "";
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const key = await keyMaterial();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// ---------- creds ----------

export interface DarajaCreds {
  id: string;
  user_id: string;
  environment: "sandbox" | "live";
  business_short_code: string;
  party_b: string;
  b2c_short_code: string;
  b2c_initiator_name: string;
  consumer_key: string;
  consumer_secret: string;
  passkey: string;
  b2c_security_credential: string;
  stk_enabled: boolean;
  b2c_enabled: boolean;
  verified: boolean;
}

export async function loadCreds(supabase: any, userId: string): Promise<DarajaCreds | null> {
  const { data } = await supabase
    .from("user_daraja_credentials")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    user_id: data.user_id,
    environment: data.environment,
    business_short_code: data.business_short_code || "",
    party_b: data.party_b || data.business_short_code || "",
    b2c_short_code: data.b2c_short_code || "",
    b2c_initiator_name: data.b2c_initiator_name || "",
    consumer_key: await decrypt(data.consumer_key_enc),
    consumer_secret: await decrypt(data.consumer_secret_enc),
    passkey: await decrypt(data.passkey_enc),
    b2c_security_credential: await decrypt(data.b2c_security_credential_enc),
    stk_enabled: !!data.stk_enabled,
    b2c_enabled: !!data.b2c_enabled,
    verified: !!data.verified,
  };
}

export function baseUrl(env: "sandbox" | "live") {
  return env === "live" ? LIVE : SANDBOX;
}

// ---------- helpers ----------

export async function getAccessToken(creds: DarajaCreds): Promise<string> {
  const auth = btoa(`${creds.consumer_key}:${creds.consumer_secret}`);
  const r = await fetch(`${baseUrl(creds.environment)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.access_token) {
    throw new Error(`Daraja OAuth failed: ${body.errorMessage || body.error_description || r.status}`);
  }
  return body.access_token as string;
}

function timestamp() {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// ---------- STK Push ----------

export interface StkArgs {
  amount: number;
  phone: string;
  reference: string;
  description?: string;
  callbackUrl: string;
}

export async function stkPush(creds: DarajaCreds, a: StkArgs) {
  const token = await getAccessToken(creds);
  const ts = timestamp();
  const password = btoa(`${creds.business_short_code}${creds.passkey}${ts}`);
  const body = {
    BusinessShortCode: creds.business_short_code,
    Password: password,
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: a.amount,
    PartyA: a.phone,
    PartyB: creds.party_b || creds.business_short_code,
    PhoneNumber: a.phone,
    CallBackURL: a.callbackUrl,
    AccountReference: a.reference.slice(0, 12),
    TransactionDesc: (a.description || "Payment").slice(0, 13),
  };
  console.log("[daraja] stkpush", body.BusinessShortCode, a.amount, a.phone);
  const r = await fetch(`${baseUrl(creds.environment)}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await r.json().catch(() => ({}));
  console.log("[daraja] stkpush response", r.status, JSON.stringify(raw));
  const ok = r.ok && String(raw.ResponseCode ?? "") === "0";
  return {
    ok,
    status: r.status,
    checkoutId: String(raw.CheckoutRequestID || raw.MerchantRequestID || Date.now()),
    raw,
    errorMessage: ok ? undefined : (raw.errorMessage || raw.ResponseDescription || `HTTP ${r.status}`),
  };
}

export async function stkQuery(creds: DarajaCreds, checkoutRequestId: string) {
  const token = await getAccessToken(creds);
  const ts = timestamp();
  const password = btoa(`${creds.business_short_code}${creds.passkey}${ts}`);
  const r = await fetch(`${baseUrl(creds.environment)}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: creds.business_short_code,
      Password: password,
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  return await r.json().catch(() => ({}));
}

// ---------- B2C ----------

export async function b2c(creds: DarajaCreds, a: { amount: number; phone: string; reference: string; remarks?: string; resultUrl: string; }) {
  const token = await getAccessToken(creds);
  const body = {
    InitiatorName: creds.b2c_initiator_name,
    SecurityCredential: creds.b2c_security_credential,
    CommandID: "BusinessPayment",
    Amount: a.amount,
    PartyA: creds.b2c_short_code,
    PartyB: a.phone,
    Remarks: (a.remarks || "Payment").slice(0, 100),
    QueueTimeOutURL: a.resultUrl,
    ResultURL: a.resultUrl,
    Occasion: a.reference.slice(0, 100),
  };
  console.log("[daraja] b2c", body.PartyA, a.amount, a.phone);
  const r = await fetch(`${baseUrl(creds.environment)}/mpesa/b2c/v1/paymentrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await r.json().catch(() => ({}));
  console.log("[daraja] b2c response", r.status, JSON.stringify(raw));
  const ok = r.ok && String(raw.ResponseCode ?? "") === "0";
  return {
    ok,
    status: r.status,
    checkoutId: String(raw.ConversationID || raw.OriginatorConversationID || Date.now()),
    raw,
    errorMessage: ok ? undefined : (raw.errorMessage || raw.ResponseDescription || `HTTP ${r.status}`),
  };
}

// ---------- C2B register (sandbox test convenience) ----------

export async function c2bRegister(creds: DarajaCreds, confirmationUrl: string, validationUrl: string) {
  const token = await getAccessToken(creds);
  const r = await fetch(`${baseUrl(creds.environment)}/mpesa/c2b/v1/registerurl`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      ShortCode: creds.business_short_code,
      ResponseType: "Completed",
      ConfirmationURL: confirmationUrl,
      ValidationURL: validationUrl,
    }),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

export function normalizeStkCallback(raw: any) {
  const cb = raw?.Body?.stkCallback || {};
  const items: any[] = cb.CallbackMetadata?.Item || [];
  const get = (n: string) => items.find((i) => i.Name === n)?.Value;
  const resultCode = cb.ResultCode;
  return {
    checkoutRequestId: cb.CheckoutRequestID as string,
    status: resultCode === 0 ? "completed" : resultCode === 1032 ? "cancelled" : "failed",
    mpesaReceipt: get("MpesaReceiptNumber") ? String(get("MpesaReceiptNumber")) : "",
    amount: Number(get("Amount") || 0),
    phone: String(get("PhoneNumber") || ""),
    raw,
  };
}
