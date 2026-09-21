import { Card, CardTitle } from "@/components/ui/card";
import { formatMetricValue, isRiskIncreasing } from "@/lib/format";
import type { MetricDeltaCard as MetricDeltaCardData } from "@/lib/types";

/**
 * The signature element (see lib/design-tokens.ts). Renders a compact
 * before -> after bar per metric. The "after" bar draws in once on mount;
 * prefers-reduced-motion collapses that to an instant final state (see
 * app/globals.css). This is theme-agnostic infra: Session 1 ships the
 * component and a static sample; Session 2 (Portfolio Copilot) is the first
 * caller with real numbers.
 */
export function MetricDeltaCard({ data }: { data: MetricDeltaCardData }) {
  return (
    <Card className="w-full max-w-md">
      <CardTitle>{data.title}</CardTitle>
      <div className="mt-3 flex flex-col gap-3">
        {data.metrics.map((m) => {
          const computedMax = Math.max(m.before, m.after) * 1.2;
          const domainMax = m.domain?.[1] ?? (computedMax || 1);
          const beforePct = Math.min(100, (m.before / domainMax) * 100);
          const afterPct = Math.min(100, (m.after / domainMax) * 100);
          const riskier = isRiskIncreasing(m);
          const barColor = m.after === m.before
            ? "bg-paper-400"
            : riskier
              ? "bg-signal-down"
              : "bg-signal-up";

          return (
            <div key={m.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-paper-400">{m.label}</span>
                <span className="font-num text-paper-100">
                  {formatMetricValue(m.before, m.format)}
                  <span className="mx-1 text-paper-400">&rarr;</span>
                  <span className={riskier ? "text-signal-down" : "text-signal-up"}>
                    {formatMetricValue(m.after, m.format)}
                  </span>
                </span>
              </div>
              <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
                {/* before marker: a static tick at the prior value */}
                <div
                  className="absolute top-0 h-full w-px bg-paper-400"
                  style={{ left: `${beforePct}%` }}
                  aria-hidden
                />
                {/* after fill: animates in from the left on mount */}
                <div
                  className={`h-full origin-left animate-bar-fill rounded-full ${barColor}`}
                  style={{ width: `${afterPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {data.note && (
        <p className="mt-3 text-xs leading-relaxed text-paper-400">{data.note}</p>
      )}
    </Card>
  );
}
