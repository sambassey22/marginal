import { MetricDeltaCard } from "@/components/cards/MetricDeltaCard";
import type { ChatMessage } from "@/lib/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-card bg-signal-brass px-4 py-2 text-sm text-ink-950"
            : "max-w-[80%] rounded-card bg-ink-800 px-4 py-2 text-sm text-paper-100"
        }
      >
        {message.text}
      </div>
      {message.cards?.map((card, i) => (
        <MetricDeltaCard key={i} data={card} />
      ))}
    </div>
  );
}
