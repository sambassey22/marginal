import type { MetricDelta } from "./types";

export function formatMetricValue(value: number, format: MetricDelta["format"]): string {
  switch (format) {
    case "percent":
      return `${value.toFixed(1)}%`;
    case "currency":
      return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    case "number":
    default:
      return value.toFixed(2);
  }
}

/** True if going from `before` to `after` reads as riskier for this metric. */
export function isRiskIncreasing(m: Pick<MetricDelta, "before" | "after" | "higherIsRiskier">): boolean {
  if (m.after === m.before) return false;
  const rising = m.after > m.before;
  return m.higherIsRiskier ? rising : !rising;
}
