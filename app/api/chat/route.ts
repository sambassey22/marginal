import { NextRequest, NextResponse } from "next/server";
import type { ChatMessage } from "@/lib/types";

// STUB (Session 1): plain text-in, text-out completion. No tool use yet.
// Session 2 adds tool calls for: Bitget UTA account/position data, a
// Yahoo-Finance-style price/correlation lookup, and a macro/news source —
// at that point this becomes an agent loop rather than a single completion.
const SYSTEM_PROMPT = `You are Marginal, a pre-trade portfolio-impact copilot for a Bitget \
Cross-Asset Unified Trading Account that holds both crypto and tokenized US \
stocks (rTokens). A trader describes a position or a hypothetical trade; you \
help them reason about how it would change their book's beta, sector \
concentration, and margin/collateral headroom. You do not have live account \
or market data access yet in this build — say so plainly rather than \
inventing numbers, and describe what you would check once connected.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { text: "ANTHROPIC_API_KEY isn't set on the server yet — add it to .env.local and restart." },
      { status: 200 }
    );
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] };

  const anthropicMessages = messages.map((m) => ({
    role: m.role,
    content: m.text,
  }));

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
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json(
      { text: `Model call failed (${res.status}). ${errText.slice(0, 200)}` },
      { status: 200 }
    );
  }

  const data = await res.json();
  const text =
    data.content?.find((b: { type: string }) => b.type === "text")?.text ??
    "No response text came back.";

  return NextResponse.json({ text });
}
