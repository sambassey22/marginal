export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  /** Optional structured cards attached to an assistant message. */
  cards?: MetricDeltaCard[];
}

/**
 * Generic "before -> after" metric card. Theme-agnostic (Session 1
 * infrastructure): any feature that needs to show a change can render one of
 * these. Session 2 (Portfolio Copilot) is the first real caller, feeding it
 * beta / concentration / collateral-headroom numbers computed from the live
 * Bitget UTA account plus macro correlation data.
 */
export interface MetricDeltaCard {
  title: string;
  metrics: MetricDelta[];
  /** Short plain-language takeaway shown under the bars. */
  note?: string;
}

export interface MetricDelta {
  label: string;
  before: number;
  after: number;
  /** Value formatting: plain number, percentage, or currency. */
  format: "number" | "percent" | "currency";
  /** Domain used to normalize the bar width. Defaults to [0, max(before, after) * 1.2]. */
  domain?: [number, number];
  /** Whether an increase in this metric reads as riskier. Flips bar color semantics. */
  higherIsRiskier: boolean;
}

/** Ticker-strip headline numbers. Session 1 renders these from static
 * placeholder data; Session 2 replaces the source with a live call to
 * GET /api/v3/account/assets on the connected Bitget account. */
export interface AccountHeadline {
  equityUsd: number;
  todayChangePct: number;
  marginUtilizationPct: number;
  isLive: boolean;
}
