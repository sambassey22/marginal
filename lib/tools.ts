import { getBitgetCredentialsFromEnv, getAccountAssets } from "./bitget";
import { previewTradeImpact, type TradeProposal } from "./portfolio";
import type { MetricDeltaCard } from "./types";

export const TOOL_DEFINITIONS = [
  {
    name: "get_portfolio_snapshot",
    description:
      "Get the connected Bitget account's current holdings (crypto and rToken) and equity. Use this when the trader asks what they're holding, or before reasoning about a trade if you need to know what's already in the book.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "preview_trade_impact",
    description:
      "Compute how a hypothetical trade would change the connected account's portfolio beta (vs. SPY), sector concentration, and collateral headroom. Use this whenever the trader proposes or asks about adding to or reducing a position — this is the core feature, prefer it over describing the trade only in words.",
    input_schema: {
      type: "object",
      properties: {
        coin: {
          type: "string",
          description:
            "Bitget coin ticker for the asset, e.g. 'rNVDA' for tokenized Nvidia stock, 'rTSLA' for tokenized Tesla, 'BTC' for Bitcoin.",
        },
        side: { type: "string", enum: ["buy", "sell"] },
        usdAmount: { type: "number", description: "Size of the trade in USD." },
      },
      required: ["coin", "side", "usdAmount"],
    },
  },
] as const;

/** Same tools, converted to OpenAI-style function-calling shape — what
 * Hugging Face's router (and Kimi K2's own tool-calling format) expects.
 * Kept alongside TOOL_DEFINITIONS (Anthropic shape) rather than replacing
 * it, so switching the chat model back to Claude later is a route.ts
 * change, not a schema rewrite. */
export const OPENAI_TOOL_DEFINITIONS = TOOL_DEFINITIONS.map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}));

export interface ToolRunResult {
  output: unknown;
  card?: MetricDeltaCard;
}

export async function runTool(name: string, input: Record<string, unknown>): Promise<ToolRunResult> {
  const creds = getBitgetCredentialsFromEnv();

  if (name === "get_portfolio_snapshot") {
    if (!creds) {
      return { output: { connected: false, message: "No Bitget account is connected yet." } };
    }
    const assets = await getAccountAssets(creds);
    return {
      output: {
        connected: true,
        accountEquityUsd: parseFloat(assets.usdtEquity),
        unrealizedPnlUsd: parseFloat(assets.unrealisedPnl),
        holdings: assets.assets
          .filter((a) => parseFloat(a.usdValue) > 1)
          .map((a) => ({ coin: a.coin, usdValue: parseFloat(a.usdValue) })),
      },
    };
  }

  if (name === "preview_trade_impact") {
    const trade = input as unknown as TradeProposal;
    const result = await previewTradeImpact(creds, trade);

    if (!result.connected) {
      return { output: result };
    }

    const { impact } = result;
    const verb = trade.side === "buy" ? "add" : "reduce";
    const card: MetricDeltaCard = {
      title: `If you ${verb} $${trade.usdAmount.toLocaleString()} of ${trade.coin}`,
      metrics: [
        {
          label: "Portfolio beta (vs. SPY)",
          before: impact.beforeBeta,
          after: impact.afterBeta,
          format: "number",
          higherIsRiskier: true,
        },
        {
          label: `${impact.sector} concentration`,
          before: impact.beforeConcentrationPct,
          after: impact.afterConcentrationPct,
          format: "percent",
          higherIsRiskier: true,
        },
        {
          label: "Collateral headroom (simplified)",
          before: impact.beforeHeadroomUsd,
          after: impact.afterHeadroomUsd,
          format: "currency",
          higherIsRiskier: false,
        },
      ],
      note: impact.caveats.join(" "),
    };

    return { output: result, card };
  }

  return { output: { error: `Unknown tool: ${name}` } };
}
