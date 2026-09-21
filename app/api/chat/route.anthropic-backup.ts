import { NextRequest, NextResponse } from "next/server";
import type { ChatMessage, MetricDeltaCard } from "@/lib/types";
import { TOOL_DEFINITIONS, runTool } from "@/lib/tools";

// Session 4: real agent loop. Claude can call get_portfolio_snapshot and
// preview_trade_impact (lib/tools.ts -> lib/portfolio.ts -> lib/bitget.ts +
// lib/correlation.ts) mid-conversation. Loop bound (MAX_TOOL_ROUNDS) exists
// so a confused model can't loop forever inside one request.

const SYSTEM_PROMPT = `You are Marginal, a pre-trade portfolio-impact copilot for a Bitget \
Cross-Asset Unified Trading Account that holds both crypto and tokenized US \
stocks (rTokens). A trader describes a position or a hypothetical trade; you \
help them reason about how it would change their book's beta (vs. SPY), \
sector concentration, and collateral headroom.

You have two tools: get_portfolio_snapshot (current holdings) and \
preview_trade_impact (before/after impact of a hypothetical buy or sell). \
Prefer calling preview_trade_impact whenever the trader proposes or asks \
about a trade — don't just describe it in words when you can compute it.

If a tool reports connected: false, say plainly that no Bitget account is \
connected yet rather than inventing numbers. If preview_trade_impact \
returns caveats, always relay them in your own words — they cover real \
simplifications in how the numbers are computed (collateral headroom is an \
estimate, not Bitget's exact formula; a "buy" is modeled as fresh capital, \
not reallocated from elsewhere). Keep responses short — a sentence or two \
of narration; the structured card carries the numbers, you don't need to \
repeat every figure in prose.`;

const MAX_TOOL_ROUNDS = 4;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { text: "ANTHROPIC_API_KEY isn't set on the server yet — add it to .env.local and restart." },
      { status: 200 }
    );
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anthropicMessages: any[] = messages.map((m) => ({
    role: m.role,
    content: m.text,
  }));

  const cards: MetricDeltaCard[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: anthropicMessages,
        tools: TOOL_DEFINITIONS,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { text: `Model call failed (${res.status}). ${errText.slice(0, 200)}`, cards },
        { status: 200 }
      );
    }

    const data = await res.json();
    const content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }> =
      data.content ?? [];

    if (data.stop_reason !== "tool_use") {
      const text = content.find((b) => b.type === "text")?.text ?? "No response text came back.";
      return NextResponse.json({ text, cards });
    }

    // Assistant's tool-use turn goes back into history verbatim.
    anthropicMessages.push({ role: "assistant", content });

    const toolResults = [];
    for (const block of content) {
      if (block.type !== "tool_use" || !block.name || !block.id) continue;
      const { output, card } = await runTool(block.name, block.input ?? {});
      if (card) cards.push(card);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(output),
      });
    }
    anthropicMessages.push({ role: "user", content: toolResults });
  }

  return NextResponse.json({
    text: "That took more tool calls than expected — try rephrasing the question.",
    cards,
  });
}
