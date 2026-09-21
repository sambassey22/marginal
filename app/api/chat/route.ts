import { NextRequest, NextResponse } from "next/server";
import dns from "dns";
import type { ChatMessage, MetricDeltaCard } from "@/lib/types";
import { OPENAI_TOOL_DEFINITIONS, runTool } from "@/lib/tools";

// Local dev "fetch failed" against an external HTTPS host is very often
// Node resolving an IPv6 (AAAA) address the local network can't actually
// route to, while curl/browsers fall back to IPv4 fine. Forcing IPv4 first
// is safe with no downside when IPv6 does work — added after exactly this
// symptom showed up testing Session 6 locally.
dns.setDefaultResultOrder("ipv4first");

// Session 6: swapped the chat model to Kimi K2 via Hugging Face's Inference
// Providers router, ahead of the live demo. HF's router is OpenAI-compatible
// (POST /v1/chat/completions, Bearer auth, `tools`/`tool_calls` in the
// standard OpenAI function-calling shape) — a materially different request/
// response shape from the Anthropic Messages API this route used through
// Session 5, so this is a full rewrite of the loop, not a one-line model
// swap. See SESSION_REPORT.md Session 6 for what's verified vs. assumed.

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
const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
// Overridable via env without a code change — e.g. to pin a provider with
// "moonshotai/Kimi-K2-Instruct-0905:groq", or roll back to plain
// "moonshotai/Kimi-K2-Instruct" if the -0905 checkpoint isn't served by
// whichever provider HF routes to. Left unsuffixed here, which per HF's own
// docs falls back to their default provider for this model.
const KIMI_MODEL = process.env.KIMI_MODEL || "moonshotai/Kimi-K2-Instruct-0905";

interface OpenAiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenAiMessage = any;

export async function POST(req: NextRequest) {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    return NextResponse.json(
      { text: "HF_TOKEN isn't set on the server yet — add it to .env.local (a token from https://huggingface.co/settings/tokens) and restart." },
      { status: 200 }
    );
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] };

  const chatMessages: OpenAiMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.text })),
  ];

  const cards: MetricDeltaCard[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let res: Response;
    try {
      res = await fetch(HF_ROUTER_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${hfToken}`,
        },
        body: JSON.stringify({
          model: KIMI_MODEL,
          messages: chatMessages,
          tools: OPENAI_TOOL_DEFINITIONS,
          tool_choice: "auto",
          max_tokens: 1024,
          temperature: 0.6, // Kimi K2's own recommended default
        }),
      });
    } catch {
      return NextResponse.json(
        { text: "Couldn't reach the Hugging Face router — check network/DNS and try again.", cards },
        { status: 200 }
      );
    }

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { text: `Model call failed (${res.status}). ${errText.slice(0, 300)}`, cards },
        { status: 200 }
      );
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const message = choice?.message;
    const toolCalls: OpenAiToolCall[] | undefined = message?.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      const text = message?.content ?? "No response text came back.";
      return NextResponse.json({ text, cards });
    }

    // Assistant's tool-call turn goes back into history verbatim — the
    // OpenAI/HF shape requires the exact tool_calls block to precede the
    // matching role:"tool" results below.
    chatMessages.push({ role: "assistant", content: message.content ?? null, tool_calls: toolCalls });

    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        // Malformed arguments from the model — pass an empty object through
        // rather than crashing the whole request; runTool's per-tool logic
        // will report back whatever's missing.
      }
      const { output, card } = await runTool(call.function.name, args);
      if (card) cards.push(card);
      chatMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(output),
      });
    }
  }

  return NextResponse.json({
    text: "That took more tool calls than expected — try rephrasing the question.",
    cards,
  });
}
