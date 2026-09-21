import { NextRequest, NextResponse } from "next/server";
import { fetchDailyCloses, underlyingYahooSymbol, MarketDataUnavailableError } from "@/lib/market-history";
import { betaAndCorrelation } from "@/lib/correlation";

// GET /api/market/beta?symbol=rNVDAUSDT&benchmark=SPY
//
// `symbol` accepts either a Bitget-style trading-pair symbol (rNVDAUSDT,
// BTCUSDT) or a plain Yahoo ticker (NVDA, BTC-USD) directly — useful for
// testing this endpoint before any real Bitget position data exists.
// `benchmark` defaults to SPY (the same convention used by comparable
// tools — see SESSION_REPORT.md prior-art note).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSymbol = searchParams.get("symbol");
  const benchmarkSymbol = searchParams.get("benchmark") || "SPY";

  if (!rawSymbol) {
    return NextResponse.json({ error: "Pass ?symbol=rNVDAUSDT (or a plain ticker like NVDA)." }, { status: 400 });
  }

  const yahooSymbol = underlyingYahooSymbol(rawSymbol) ?? rawSymbol.toUpperCase();

  try {
    const [assetBars, benchmarkBars] = await Promise.all([
      fetchDailyCloses(yahooSymbol),
      fetchDailyCloses(benchmarkSymbol),
    ]);

    if (assetBars.length < 30 || benchmarkBars.length < 30) {
      return NextResponse.json({
        available: false,
        reason: "insufficient_history",
        message: `Only ${assetBars.length} bars for ${yahooSymbol}, ${benchmarkBars.length} for ${benchmarkSymbol} — need at least 30 to compute a meaningful beta.`,
      });
    }

    const result = betaAndCorrelation(assetBars, benchmarkBars);
    return NextResponse.json({
      available: true,
      symbol: rawSymbol,
      resolvedTicker: yahooSymbol,
      benchmark: benchmarkSymbol,
      ...result,
    });
  } catch (err) {
    const message =
      err instanceof MarketDataUnavailableError
        ? err.message
        : "Couldn't compute beta/correlation right now.";
    return NextResponse.json({ available: false, reason: "fetch_error", message });
  }
}
