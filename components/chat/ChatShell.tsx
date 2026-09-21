"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { TickerStrip } from "@/components/chat/TickerStrip";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ChatMessage, AccountHeadline } from "@/lib/types";

// STUB (Session 1): static demo headline + a seeded first message showing
// the signature card with sample numbers, so the core screen is reviewable
// before Session 2 wires a live account. See TickerStrip and
// MetricDeltaCard for what each will look like with real data.
const DEMO_HEADLINE: AccountHeadline = {
  equityUsd: 12480,
  todayChangePct: 2.1,
  marginUtilizationPct: 34,
  isLive: false,
};

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: "seed-1",
    role: "assistant",
    text:
      "This is a sample impact preview using demo numbers, not your live account yet — ask about a trade to see the shape of the analysis.",
    cards: [
      {
        title: "If you add 500 rNVDA",
        note:
          "Sample data. Once the account is connected, this compares your real book before and after the trade.",
        metrics: [
          { label: "Portfolio beta", before: 0.94, after: 1.11, format: "number", higherIsRiskier: true },
          { label: "Tech concentration", before: 41, after: 52, format: "percent", higherIsRiskier: true },
          { label: "Collateral headroom", before: 3200, after: 4440, format: "currency", higherIsRiskier: false },
        ],
      },
    ],
  },
];

export function ChatShell() {
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  async function send() {
    const text = draft.trim();
    if (!text || pending) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: data.text ?? "Something went wrong on my end." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "I couldn't reach the model just now — check that ANTHROPIC_API_KEY is set and try again.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TickerStrip headline={DEMO_HEADLINE} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {pending && (
          <div className="text-xs text-paper-400">thinking&hellip;</div>
        )}
      </main>
      <div className="sticky bottom-0 border-t border-ink-700 bg-ink-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-end gap-2 px-4 py-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about a trade, a position, a scenario…"
            className="rounded-card border border-ink-700 bg-ink-800 px-3 py-2"
          />
          <Button onClick={send} disabled={pending} aria-label="Send">
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
