import { NextResponse } from "next/server";
import {
  getBitgetCredentialsFromEnv,
  getAccountAssets,
  getCurrentPositions,
  BitgetApiError,
} from "@/lib/bitget";
import type { AccountHeadline } from "@/lib/types";

// GET /api/account -> AccountHeadline, or a clear "not configured"/"error"
// shape instead of ever pretending demo numbers are live. The client
// (ChatShell) falls back to its own static demo data when isLive is false
// so the app still runs before Bitget credentials exist.
export async function GET() {
  const creds = getBitgetCredentialsFromEnv();

  if (!creds) {
    return NextResponse.json({
      isLive: false,
      reason: "not_configured",
      message: "BITGET_API_KEY / SECRET / PASSPHRASE aren't set — showing demo data.",
    });
  }

  try {
    const [assets, positions] = await Promise.all([
      getAccountAssets(creds),
      // "SPOT" covers both crypto spot and rToken holdings per Bitget's
      // July 2026 Cross-Asset UTA launch — unconfirmed against a real
      // response; if this category value is wrong, Bitget returns an
      // explicit invalid-parameter error rather than an empty 200.
      getCurrentPositions(creds, "SPOT").catch(() => [] as const),
    ]);

    const headline: AccountHeadline = {
      equityUsd: parseFloat(assets.usdtEquity),
      unrealizedPnlUsd: parseFloat(assets.unrealisedPnl),
      marginRatioPct: parseFloat(assets.mgnRatio) * 100,
      positionsCount: positions.length,
      isLive: true,
    };
    return NextResponse.json(headline);
  } catch (err) {
    const message =
      err instanceof BitgetApiError
        ? `Bitget error ${err.code}: ${err.message}`
        : "Couldn't reach Bitget — showing demo data.";
    return NextResponse.json({ isLive: false, reason: "api_error", message });
  }
}
