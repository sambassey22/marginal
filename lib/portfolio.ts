import type { BitgetCredentials, BitgetAssetHolding } from "./bitget";
import { getAccountAssets } from "./bitget";
import { fetchDailyCloses, yahooTickerForCoin, MarketDataUnavailableError } from "./market-history";
import { betaAndCorrelation } from "./correlation";

const BENCHMARK = "SPY";

/**
 * Coarse sector map covering Bitget's initial rToken set (confirmed from
 * the July 2026 Cross-Asset UTA launch announcement: rAAPL, rAMZN, rMETA,
 * rTSLA, rGOOGL, rNVDA, rMSFT, rQQQ, rSPY, rJPM, rWMT, rV, rMSTR) plus a
 * handful of major crypto coins. Anything not listed falls back to
 * "Other" rather than a guess — a real sector/industry API is future
 * work, not something to fake with a plausible-looking default.
 */
const SECTOR_MAP: Record<string, string> = {
  AAPL: "Tech", MSFT: "Tech", NVDA: "Tech", GOOGL: "Tech", META: "Tech", AMZN: "Tech", MSTR: "Tech",
  TSLA: "Consumer/Auto",
  JPM: "Financials", V: "Financials",
  WMT: "Consumer/Retail",
  SPY: "Broad market", QQQ: "Broad market",
  BTC: "Crypto", ETH: "Crypto", SOL: "Crypto", XRP: "Crypto", BNB: "Crypto", DOGE: "Crypto",
};

function sectorForCoin(coin: string): string {
  const ticker = coin.replace(/^r/, "").toUpperCase();
  return SECTOR_MAP[ticker] ?? "Other";
}

export interface ResolvedPosition {
  coin: string;
  usdValue: number;
  beta: number;
  sector: string;
}

export interface TradeProposal {
  coin: string;
  side: "buy" | "sell";
  usdAmount: number;
}

export interface PortfolioImpact {
  sector: string;
  beforeBeta: number;
  afterBeta: number;
  beforeConcentrationPct: number;
  afterConcentrationPct: number;
  beforeHeadroomUsd: number;
  afterHeadroomUsd: number;
  caveats: string[];
}

function weightedBeta(positions: ResolvedPosition[], equity: number): number {
  if (equity <= 0) return 0;
  return positions.reduce((sum, p) => sum + (p.usdValue / equity) * p.beta, 0);
}

function concentrationPct(positions: ResolvedPosition[], sector: string, equity: number): number {
  if (equity <= 0) return 0;
  const sectorValue = positions.filter((p) => p.sector === sector).reduce((s, p) => s + p.usdValue, 0);
  return (sectorValue / equity) * 100;
}

export function computePortfolioImpact(
  positions: ResolvedPosition[],
  accountEquity: number,
  imr: number,
  trade: ResolvedPosition & { side: "buy" | "sell" }
): PortfolioImpact {
  let afterPositions: ResolvedPosition[];
  let afterEquity: number;

  if (trade.side === "buy") {
    afterPositions = [...positions, trade];
    afterEquity = accountEquity + trade.usdValue; // simplified: treated as fresh capital, see caveats
  } else {
    afterPositions = positions.map((p) =>
      p.coin === trade.coin ? { ...p, usdValue: Math.max(0, p.usdValue - trade.usdValue) } : p
    );
    afterEquity = accountEquity; // simplified: proceeds assumed to stay as cash in the account
  }

  return {
    sector: trade.sector,
    beforeBeta: weightedBeta(positions, accountEquity),
    afterBeta: weightedBeta(afterPositions, afterEquity),
    beforeConcentrationPct: concentrationPct(positions, trade.sector, accountEquity),
    afterConcentrationPct: concentrationPct(afterPositions, trade.sector, afterEquity),
    beforeHeadroomUsd: accountEquity - imr,
    afterHeadroomUsd: afterEquity - imr,
    caveats: [
      "Collateral headroom is a simplified estimate (account equity minus initial margin requirement), not Bitget's exact tiered collateral-discount formula.",
      trade.side === "buy"
        ? "Assumes this trade is funded with new capital, not reallocated from an existing position."
        : "Assumes sale proceeds stay as cash in the account.",
    ],
  };
}

/** Resolves one coin's beta vs SPY, tolerating failure (returns beta 0 +
 * a caveat rather than throwing) so one bad symbol never kills the whole
 * portfolio computation. `spyCache` lets every position in one request
 * share a single SPY fetch instead of refetching it per-position. */
async function resolveCoin(
  coin: string,
  usdValue: number,
  spyCache: { bars?: Awaited<ReturnType<typeof fetchDailyCloses>> },
  caveats: string[]
): Promise<ResolvedPosition> {
  const sector = sectorForCoin(coin);
  const yahooTicker = yahooTickerForCoin(coin);

  if (!yahooTicker) {
    // Stablecoin or unmapped — treated as cash-like, beta 0, not an error.
    return { coin, usdValue, beta: 0, sector };
  }

  try {
    if (!spyCache.bars) spyCache.bars = await fetchDailyCloses(BENCHMARK);
    const assetBars = await fetchDailyCloses(yahooTicker);
    const { beta } = betaAndCorrelation(assetBars, spyCache.bars);
    return { coin, usdValue, beta: beta ?? 0, sector };
  } catch (err) {
    const message = err instanceof MarketDataUnavailableError ? err.message : `Couldn't price ${coin}.`;
    caveats.push(`${message} Treated as beta 0 for this preview rather than blocking the whole result.`);
    return { coin, usdValue, beta: 0, sector };
  }
}

export interface TradeImpactResult {
  connected: true;
  accountEquity: number;
  imr: number;
  positionsConsidered: number;
  impact: PortfolioImpact;
}

export type TradeImpactOutcome =
  | TradeImpactResult
  | { connected: false; reason: string; message: string };

/** The full Session 4 orchestration: live Bitget assets -> resolve each
 * holding's beta/sector -> compute before/after impact of the proposed
 * trade. This is what the chat agent's tool call actually runs. */
export async function previewTradeImpact(
  creds: BitgetCredentials | null,
  trade: TradeProposal
): Promise<TradeImpactOutcome> {
  if (!creds) {
    return {
      connected: false,
      reason: "not_configured",
      message: "No Bitget account is connected yet, so I can't compute a real impact preview.",
    };
  }

  const assets = await getAccountAssets(creds);
  const accountEquity = parseFloat(assets.usdtEquity);
  const imr = parseFloat(assets.imr);

  const caveats: string[] = [];
  const spyCache: { bars?: Awaited<ReturnType<typeof fetchDailyCloses>> } = {};

  const holdings: BitgetAssetHolding[] = assets.assets.filter((a) => parseFloat(a.usdValue) > 1);
  const positions = await Promise.all(
    holdings.map((h) => resolveCoin(h.coin, parseFloat(h.usdValue), spyCache, caveats))
  );

  const tradeResolved = await resolveCoin(trade.coin, trade.usdAmount, spyCache, caveats);

  if (trade.side === "sell" && !positions.some((p) => p.coin === trade.coin)) {
    caveats.push(`No existing ${trade.coin} position was found in the account, so this sell has no modeled impact.`);
  }

  const impact = computePortfolioImpact(positions, accountEquity, imr, {
    ...tradeResolved,
    side: trade.side,
  });
  impact.caveats.push(...caveats);

  return {
    connected: true,
    accountEquity,
    imr,
    positionsConsidered: positions.length,
    impact,
  };
}
