import crypto from "crypto";

/**
 * Bitget UTA v3 signed REST client.
 *
 * Verified against public Bitget UTA v3 SDK documentation (bitget-go /
 * bitget-php / go-bitget wikis — see SESSION_REPORT.md Session 2 for
 * sources), NOT against a real Bitget response yet, because no credential
 * existed at build time to test with. Per AGENT_BUILD_RULESET.md rule 9
 * ("new packages/APIs verified once, then trusted"): treat this file as
 * the one-time verification pass, and confirm it against a real call the
 * first time a Demo API key is available — if the timestamp format or
 * signing string is off, Bitget returns a clear "invalid sign" /
 * "timestamp expired" error rather than failing silently.
 *
 * Signing (confirmed across three independent SDKs' docs):
 *   pre-hash = timestamp + METHOD + requestPath[+ "?" + query] + body
 *   ACCESS-SIGN = base64(HMAC-SHA256(pre-hash, secretKey))
 * Headers: ACCESS-KEY, ACCESS-SIGN, ACCESS-TIMESTAMP, ACCESS-PASSPHRASE.
 * Demo/paper-trading accounts additionally require `paptrading: 1`.
 *
 * Timestamp format assumed to be milliseconds-since-epoch as a string,
 * matching Bitget's long-standing v1/v2 convention — unconfirmed for v3
 * specifically until the first real call.
 */

const BASE_URL = "https://api.bitget.com";

export interface BitgetCredentials {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  demo?: boolean;
}

export function getBitgetCredentialsFromEnv(): BitgetCredentials | null {
  const apiKey = process.env.BITGET_API_KEY;
  const secretKey = process.env.BITGET_SECRET_KEY;
  const passphrase = process.env.BITGET_PASSPHRASE;
  if (!apiKey || !secretKey || !passphrase) return null;
  return { apiKey, secretKey, passphrase, demo: true };
}

function sign(prehash: string, secretKey: string): string {
  return crypto.createHmac("sha256", secretKey).update(prehash).digest("base64");
}

async function bitgetRequest<T>(
  creds: BitgetCredentials,
  method: "GET" | "POST",
  path: string,
  opts: { query?: Record<string, string>; body?: unknown } = {}
): Promise<T> {
  const timestamp = Date.now().toString();
  const query = opts.query
    ? "?" + new URLSearchParams(opts.query).toString()
    : "";
  const bodyStr = opts.body ? JSON.stringify(opts.body) : "";
  const prehash = timestamp + method + path + query + bodyStr;
  const signature = sign(prehash, creds.secretKey);

  const headers: Record<string, string> = {
    "ACCESS-KEY": creds.apiKey,
    "ACCESS-SIGN": signature,
    "ACCESS-TIMESTAMP": timestamp,
    "ACCESS-PASSPHRASE": creds.passphrase,
    "Content-Type": "application/json",
  };
  if (creds.demo) headers["paptrading"] = "1";

  const res = await fetch(BASE_URL + path + query, {
    method,
    headers,
    body: method === "POST" ? bodyStr : undefined,
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok || (json && json.code && json.code !== "00000")) {
    throw new BitgetApiError(json?.code ?? String(res.status), json?.msg ?? "Bitget request failed", json);
  }
  return json.data as T;
}

export class BitgetApiError extends Error {
  code: string;
  raw: unknown;
  constructor(code: string, message: string, raw: unknown) {
    super(message);
    this.code = code;
    this.raw = raw;
  }
}

/** GET /api/v3/account/assets — confirmed fields: AccountEquity, UsdtEquity,
 * BtcEquity, UnrealisedPnl, Mmr, Imr, MgnRatio, Assets[]. Values arrive as
 * strings (Bitget convention) — parse at the call site, don't assume number. */
export interface BitgetAccountAssets {
  accountEquity: string;
  usdtEquity: string;
  btcEquity: string;
  unrealisedPnl: string;
  mmr: string;
  imr: string;
  mgnRatio: string;
  assets: BitgetAssetHolding[];
}

export interface BitgetAssetHolding {
  coin: string;
  equity: string;
  usdValue: string;
  balance: string;
  available: string;
  debt: string;
  locked: string;
  bonus: string;
}

export function getAccountAssets(creds: BitgetCredentials) {
  return bitgetRequest<BitgetAccountAssets>(creds, "GET", "/api/v3/account/assets");
}

/** GET /api/v3/position/current-position — field names below are
 * best-effort (documented as "retains exchange ID fields, product context,
 * PnL, fee, price, quantity, status, timestamp" without a full confirmed
 * list). Treat as unverified until checked against a real response; code
 * that reads this accesses fields defensively (optional chaining) rather
 * than assuming the shape below is exact. */
export interface BitgetPosition {
  symbol: string;
  category: string;
  holdSide?: string;
  total?: string;
  available?: string;
  unrealizedPL?: string;
  markPrice?: string;
  [key: string]: unknown;
}

export function getCurrentPositions(creds: BitgetCredentials, category: string) {
  return bitgetRequest<BitgetPosition[]>(creds, "GET", "/api/v3/position/current-position", {
    query: { category },
  });
}
