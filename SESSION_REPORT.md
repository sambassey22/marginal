## Session 1: Core infrastructure — chat shell, design system, signature card
**Date:** 2026-09-18
**Goal:** Stand up the theme-agnostic app shell (chat LUI, design tokens, the
generic metric-delta card) so Session 2 can attach a live Bitget UTA
connection and real impact math without touching layout or styling.

**Scope deviation from AGENT_BUILD_RULESET.md's default stack, and why:**
The ruleset's Standard Stack assumes a monorepo (`apps/web` + `apps/api` +
`packages/`) with Supabase auth and a deploy pipeline. This project has no
user accounts, nothing to persist between visits, and a 3-day deadline
(hackathon submission due 2026-09-21 UTC+8) — that infrastructure would cost
most of a day without the product needing any of it. Built instead as a
single Next.js app (App Router, API routes inline). Flag if you'd rather
have the full stack; nothing here blocks adding Supabase later if a real
need for persistence shows up.

**Files added/changed:**
- `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs` — project + build config
- `.env.example` — every credential the project needs, Session 1 and Session 2, declared upfront
- `.gitignore`, `README.md` — housekeeping and setup instructions
- `app/layout.tsx` — root layout, loads the three token typefaces via `next/font/google`
- `app/globals.css` — Tailwind layers, focus-visible ring, prefers-reduced-motion handling, tabular-nums utility
- `app/page.tsx` — renders `ChatShell`
- `app/api/chat/route.ts` — POST handler, calls Anthropic Messages API server-side, no tool use yet
- `lib/design-tokens.ts` — documented token system (source of truth; mirrored into `tailwind.config.ts`)
- `lib/types.ts` — `ChatMessage`, `MetricDeltaCard`/`MetricDelta`, `AccountHeadline`
- `lib/format.ts` — value formatting + risk-direction helper for metric cards
- `lib/utils.ts` — `cn()` classname helper
- `components/ui/button.tsx`, `card.tsx`, `input.tsx` — hand-authored primitives standing in for `shadcn/ui` (see Assumptions)
- `components/chat/TickerStrip.tsx` — sticky header, account headline numbers (stub data)
- `components/chat/MessageBubble.tsx` — one chat message, with optional attached cards
- `components/chat/ChatShell.tsx` — client component: message state, seed message, submit handler
- `components/cards/MetricDeltaCard.tsx` — the signature element: animated before→after bars
- `public/logo.svg` — monogram mark

**Current full file tree:**
```
marginal/
├── .env.example
├── .gitignore
├── README.md
├── SESSION_REPORT.md
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx
│   └── api/chat/route.ts
├── components/
│   ├── chat/
│   │   ├── ChatShell.tsx
│   │   ├── MessageBubble.tsx
│   │   └── TickerStrip.tsx
│   ├── cards/
│   │   └── MetricDeltaCard.tsx
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
├── lib/
│   ├── design-tokens.ts
│   ├── format.ts
│   ├── types.ts
│   └── utils.ts
└── public/
    └── logo.svg
```

**Dependencies declared (not yet installed — see Assumptions):**
- `next@14.2.15`, `react@18.3.1`, `react-dom@18.3.1` — framework
- `lucide-react@0.383.0` — icons (send icon in the composer)
- `clsx@2.1.1`, `tailwind-merge@2.5.2` — classname utility for `cn()`
- `typescript@5.5.4`, `tailwindcss@3.4.10`, `postcss@8.4.41`, `autoprefixer@10.4.20`, `eslint@8.57.0`, `eslint-config-next@14.2.15` — dev tooling
- No Radix/`shadcn` package — see Assumptions

**Supabase schema state:** none — no database in this build (see scope deviation above).

**Env vars required:**
- `ANTHROPIC_API_KEY` — read by `app/api/chat/route.ts` now
- `BITGET_API_KEY`, `BITGET_SECRET_KEY`, `BITGET_PASSPHRASE` — declared in `.env.example`, not read by any code yet; Session 2's dependency

**API endpoints live:**
- `POST /api/chat` — `{ messages: ChatMessage[] }` in, `{ text: string }` out. Plain completion, no tools.

**Known stubs/mocks/TODOs:**
- `ChatShell`'s seed message and `TickerStrip`'s headline numbers are static demo data, explicitly labeled "demo data" in the UI (the ticker strip's `isLive` badge) and in the seed message's own text — never presented as real.
- `components/ui/*` are hand-authored, not the actual `shadcn/ui` package (no network access in this sandbox to run the shadcn CLI or verify a Radix version). They're styled to the same spec; swappable later with `npx shadcn@latest add button card input`.
- **The whole project is unverified: `npm install` / `npm run build` have not been run** — this sandbox had no network access to do it. Run both immediately on unzip, before Session 2 adds anything on top.
- `/api/chat` has no tool use yet — Session 2 needs it to call the Bitget UTA account/position endpoints and a correlation/history source.

**Assumptions carried into next session:**
- Session 2's angle is confirmed: Portfolio Copilot / Open Theme — pre-trade impact preview on the Bitget Cross-Asset UTA (crypto + rToken).
- Feasibility confirmed via Bitget's own docs (not assumed): `GET /api/v3/account/assets` and `GET /api/v3/position/current-position` on `https://api.bitget.com`, HMAC-SHA256-signed with a manually-created API key (Read permission is enough) — **not** the interactive Agentic OAuth/MCP flow, which writes credentials to local disk for a coding-agent session and has no clean path from a hosted web app. Use a Demo/paper-trading API key so the "connected account" is real API data, not a mock, without needing real funds.
- rTokens (e.g. `rNVDA`, `rTSLA`) live in the same Unified Trading Account as crypto per Bitget's July 2026 Cross-Asset UTA launch, so one account/position call should surface both — **not yet confirmed against a live response**, since no key exists yet to test with. Confirm the actual symbol/category shape on first real call in Session 2.
- The correlation/beta engine (macro-analyst's approach: pull each rToken's underlying stock's full pre-tokenization price history from a Yahoo-Finance-style source, since rToken itself only has ~103 days of history) needs its own data source picked and wired in Session 2 — not yet chosen or verified reachable from a Next.js server function.
- Prior art exists in this space generically (WazirX AI, PortfolioPilot, a "finsight-mpp" MCP server that already computes beta/VaR/correlation/stress scenarios for crypto portfolios) — none of it is built around Bitget's specific crypto+rToken shared-margin/collateral mechanic, which is the differentiation to keep sharp in the Project Description and demo, not "AI portfolio risk tool" in general.
- Target user for the submission form: an active retail/prosumer Bitget trader who already holds both crypto and rToken positions in the Cross-Asset UTA, moderate-to-high risk appetite, who wants a pre-trade check on beta/concentration/collateral impact before confirming a new position — not "all traders."
- Outstanding external dependency, not resolvable from this session: a Bitget account + Demo API key needs to actually be created by the person building this (Bitget login, ToS acceptance — not something an agent can do on their behalf). Doesn't block Session 2 from starting (correlation engine, UI wiring for real data shapes can be built against a documented response shape first) but does block final end-to-end testing.
- Hackathon submission deadline: 2026-09-21 (UTC+8). Required for submission alongside the demo: a project description covering thesis / target user / validation data / progress / deliverables, a "Role of the LLM" field, and a compliant X post (`#BitgetHackathon` `@Bitget_AI`) — none of that is written yet.

**Style history (cumulative):**
- **Project:** Marginal (this session)
  - Palette family: deep ink-navy base (#0D1321/#12192B/#161D30), muted jade/brick for gain/loss, a single warm brass accent (#E8B34C) carrying all interactive/CTA weight
  - Type pairing: Space Grotesk (display) / IBM Plex Sans (body) / IBM Plex Mono (every number, tabular figures)
  - Layout paradigm: single-column chat thread with a sticky ticker-strip header; the AI's analysis renders as inline rich cards in the thread rather than a separate dashboard route
  - Signature element: inline before→after metric-delta card with a one-time draw-in bar animation per metric
  - Logo approach: ascending three-bar monogram in the brass accent (see `public/logo.svg`)
