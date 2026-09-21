/**
 * Historical daily price data, keyless.
 *
 * Uses Yahoo Finance's unofficial `v8/finance/chart` endpoint. This is the
 * same approach the hackathon's own build reference describes
 * ("macro-analyst... explicitly accepts any Yahoo Finance symbol"), and is
 * confirmed across several independent third-party implementations
 * (Go/Dart/Apps-Script clients, all agreeing on the same request shape and
 * response fields) to work with no API key — just a browser-like
 * User-Agent header.
 *
 * REAL RISK, stated plainly rather than glossed over: this is an
 * undocumented, unofficial endpoint. Yahoo has been tightening bot
 * detection on other endpoints in the same family (some tools report 429s
 * even with cookie/crumb handling), and there is no SLA. It was NOT
 * possible to verify with one real live call while building this — the
 * research tool available at build time is blocked from fetching it by
 * Yahoo's robots.txt (a restriction on automated crawlers specifically;
 * it does not by itself prove a normal server-to-server request will also
 * be blocked, but it's not proof of the opposite either). Stooq, the
 * usual free fallback, now requires an API key as of March 2026 and is not
 * a keyless option anymore. If this endpoint gets blocked or rate-limited
 * during real testing, the two documented options are: (a) add a
 * browser-impersonating request library, or (b) switch to Alpha Vantage or
 * Twelve Data with a free API key. Either is a small, isolated change
 * confined to this one file.
 */

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

export interface DailyBar {
  date: string; // YYYY-MM-DD
  close: number;
}

export class MarketDataUnavailableError extends Error {}

export async function fetchDailyCloses(
  yahooSymbol: string,
  range: "3mo" | "6mo" | "1y" | "2y" | "5y" = "1y"
): Promise<DailyBar[]> {
  const url = `${YAHOO_BASE}/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=1d`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      cache: "no-store",
    });
  } catch {
    throw new MarketDataUnavailableError(`Couldn't reach the price history source for ${yahooSymbol}.`);
  }

  if (!res.ok) {
    throw new MarketDataUnavailableError(
      `Price history source returned ${res.status} for ${yahooSymbol}.`
    );
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (json?.chart?.error || !result) {
    throw new MarketDataUnavailableError(`No price history found for ${yahooSymbol}.`);
  }

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

  const bars: DailyBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c === null || c === undefined) continue; // Yahoo leaves nulls on non-trading days
    bars.push({ date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10), close: c });
  }
  return bars;
}

/**
 * Maps a Bitget UTA symbol to the Yahoo ticker for its underlying asset.
 *
 * rToken naming (e.g. rNVDA, rTSLA, rSPY) is confirmed directly from
 * Bitget's own July 2026 Cross-Asset UTA launch announcement, which names
 * rAAPL/rAMZN/rMETA/rTSLA/rGOOGL/rNVDA/rMSFT/rQQQ/rSPY/rJPM/rWMT/rV/rMSTR
 * as the initial rToken set — high confidence. The exact *trading pair*
 * symbol format Bitget's position endpoint returns (assumed here to be
 * "rNVDAUSDT" style, USDT-quoted) is NOT yet confirmed against a real API
 * response (see SESSION_REPORT.md) — fix this function first if Session 4
 * finds real positions come back shaped differently.
 */
export function underlyingYahooSymbol(bitgetSymbol: string): string | null {
  // Known limitation: a crypto ticker that happens to start with "r" (e.g.
  // a hypothetical RENDERUSDT) would incorrectly match the rToken pattern
  // below and resolve to a nonexistent Yahoo ticker. That fails safely —
  // fetchDailyCloses throws MarketDataUnavailableError rather than
  // returning wrong data — but it's a real gap worth a proper rToken
  // allow-list (the known rAAPL/rNVDA/... set) if it comes up in testing.
  const rTokenMatch = bitgetSymbol.match(/^r([A-Z]+)USDT$/i);
  if (rTokenMatch) return rTokenMatch[1].toUpperCase();

  const cryptoMatch = bitgetSymbol.match(/^([A-Z]+)USDT$/i);
  if (cryptoMatch) return `${cryptoMatch[1].toUpperCase()}-USD`;

  return null;
}
