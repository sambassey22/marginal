import type { DailyBar } from "./market-history";

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Simple (non-log) daily percentage returns. */
export function dailyReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    out.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return out;
}

/**
 * Intersects two daily-bar series by date and returns their closes in the
 * same date order, so returns computed afterward from each aligned array
 * line up day-for-day. Necessary because crypto trades every day and
 * stocks/rTokens (per the underlying Yahoo history) don't.
 */
export function alignByDate(a: DailyBar[], b: DailyBar[]): { a: number[]; b: number[]; dates: string[] } {
  const bByDate = new Map(b.map((bar) => [bar.date, bar.close]));
  const alignedA: number[] = [];
  const alignedB: number[] = [];
  const dates: string[] = [];
  for (const bar of a) {
    const bClose = bByDate.get(bar.date);
    if (bClose === undefined) continue;
    alignedA.push(bar.close);
    alignedB.push(bClose);
    dates.push(bar.date);
  }
  return { a: alignedA, b: alignedB, dates };
}

/** Pearson correlation coefficient, -1..1. Returns null if either series
 * has zero variance (e.g. too few data points, or a flat price). */
export function correlation(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 2) return null;
  const mx = mean(x);
  const my = mean(y);
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX === 0 || varY === 0) return null;
  return cov / Math.sqrt(varX * varY);
}

/** Beta of `assetReturns` against `benchmarkReturns`: cov(asset,bench) /
 * var(bench). Returns null if the benchmark has zero variance. */
export function beta(assetReturns: number[], benchmarkReturns: number[]): number | null {
  if (assetReturns.length !== benchmarkReturns.length || assetReturns.length < 2) return null;
  const ma = mean(assetReturns);
  const mb = mean(benchmarkReturns);
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < assetReturns.length; i++) {
    cov += (assetReturns[i] - ma) * (benchmarkReturns[i] - mb);
    varB += (benchmarkReturns[i] - mb) * (benchmarkReturns[i] - mb);
  }
  if (varB === 0) return null;
  return cov / varB;
}

/** Convenience: beta and correlation of one bar series against another,
 * handling date alignment and return calculation together. */
export function betaAndCorrelation(assetBars: DailyBar[], benchmarkBars: DailyBar[]) {
  const aligned = alignByDate(assetBars, benchmarkBars);
  const assetReturns = dailyReturns(aligned.a);
  const benchReturns = dailyReturns(aligned.b);
  return {
    beta: beta(assetReturns, benchReturns),
    correlation: correlation(assetReturns, benchReturns),
    dataPoints: assetReturns.length,
  };
}
