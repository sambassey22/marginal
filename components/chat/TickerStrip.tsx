import type { AccountHeadline } from "@/lib/types";

/**
 * STUB (Session 1): renders whatever AccountHeadline it's given. Session 2
 * replaces the caller's static placeholder with a live GET
 * /api/v3/account/assets call against the connected Bitget account and sets
 * isLive: true. Until then this always reads "demo data" to avoid implying
 * a live connection that doesn't exist yet.
 */
export function TickerStrip({ headline }: { headline: AccountHeadline }) {
  const up = headline.todayChangePct >= 0;
  return (
    <header className="sticky top-0 z-10 border-b border-ink-700 bg-ink-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-3 font-num text-sm">
        <span className="font-display font-medium tracking-tight text-paper-100">
          Marginal
        </span>
        <span className="text-paper-400">
          Equity{" "}
          <span className="text-paper-100">
            ${headline.equityUsd.toLocaleString()}
          </span>
        </span>
        <span className="text-paper-400">
          Today{" "}
          <span className={up ? "text-signal-up" : "text-signal-down"}>
            {up ? "+" : ""}
            {headline.todayChangePct.toFixed(1)}%
          </span>
        </span>
        <span className="text-paper-400">
          Margin used{" "}
          <span className="text-paper-100">{headline.marginUtilizationPct.toFixed(0)}%</span>
        </span>
        <span className="ml-auto rounded-full border border-ink-700 px-2 py-0.5 text-[11px] font-body text-paper-400">
          {headline.isLive ? "live" : "demo data"}
        </span>
      </div>
    </header>
  );
}
