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

---

## Session 2: Bitget UTA v3 account data — live ticker strip
**Date:** 2026-09-18
**Goal:** Wire a real, signed Bitget UTA v3 REST client and replace the ticker strip's static numbers with a live account snapshot when credentials exist, falling back to demo data with a clear reason otherwise.

**Pre-flight check (state pulled from Session 1's report before writing code):** Confirmed against Session 1's report — file tree, `AccountHeadline` type, `TickerStrip`/`ChatShell` components, and the declared-but-unread `BITGET_*` env vars all matched what actually existed in the Session 1 tree. No drift found.

**Files added/changed:**
- `lib/bitget.ts` — new: signed Bitget UTA v3 REST client (HMAC-SHA256), `getAccountAssets`, `getCurrentPositions`, `getBitgetCredentialsFromEnv`, `BitgetApiError`
- `app/api/account/route.ts` — new: `GET` handler, returns a live `AccountHeadline` when Bitget credentials are configured and reachable, or `{ isLive: false, reason, message }` otherwise — never a partially-faked live number
- `lib/types.ts` — changed: `AccountHeadline` reshaped to fields Bitget's assets endpoint actually confirms (`equityUsd`, `unrealizedPnlUsd`, `marginRatioPct`, `positionsCount`) — dropped Session 1's placeholder `todayChangePct`/`marginUtilizationPct`, which had no backing field
- `components/chat/TickerStrip.tsx` — changed: renders the new field set; "Margin ratio" label kept literal to the source field name rather than asserting a specific "utilization" meaning that isn't confirmed
- `components/chat/ChatShell.tsx` — changed: fetches `/api/account` on mount, adopts the result only when `isLive: true`, otherwise keeps the demo baseline
- `.env.example` — changed: comment updated, `BITGET_*` vars are now actually read by code
- `marginal-preview.html` (chat-only visual aid, not part of the zip) — changed: ticker numbers updated to match the new field set

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
│   └── api/
│       ├── chat/route.ts
│       └── account/route.ts
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
│   ├── bitget.ts
│   ├── design-tokens.ts
│   ├── format.ts
│   ├── types.ts
│   └── utils.ts
└── public/
    └── logo.svg
```

**Dependencies declared:** unchanged from Session 1 — `lib/bitget.ts` uses only Node's built-in `crypto`, no new package added.

**Supabase schema state:** none (unchanged).

**Env vars required (cumulative):**
- `ANTHROPIC_API_KEY` — read by `app/api/chat/route.ts`
- `BITGET_API_KEY`, `BITGET_SECRET_KEY`, `BITGET_PASSPHRASE` — read by `lib/bitget.ts` / `app/api/account/route.ts` as of this session

**API endpoints live (cumulative):**
- `POST /api/chat` — unchanged, still no tool use
- `GET /api/account` — new: `AccountHeadline` when live, `{ isLive: false, reason: "not_configured" | "api_error", message }` otherwise

**Known stubs/mocks/TODOs (cumulative):**
- `ChatShell`'s seed message and its impact-preview card are still static sample data (unchanged from Session 1) — the account snapshot is the only thing this session made live
- `components/ui/*` still hand-authored, not the real `shadcn/ui` package (unchanged)
- **Still unverified: no `npm install`/`npm run build` in this sandbox.** Ran a TypeScript syntax-only check again this session (global `tsc`, ignoring "cannot find module" noise from the missing `node_modules`) — no real syntax errors found, but this is not a substitute for a real build. Run one before Session 3.
- `lib/bitget.ts`'s signing scheme and field names (`mgnRatio`, the `SPOT` category value for positions, the `paptrading: 1` demo header, ms-timestamp format) are verified against public UTA v3 SDK documentation only, **not against one real Bitget response** — no key existed at build time. The first real call is the actual verification; if it 401s/400s, check the timestamp format and category value first.
- `/api/chat` still has no tool use — Session 3's job.

**Assumptions carried into next session:**
- The Bitget signing scheme, endpoints, and field names above are this project's one-time-verify-then-trust pass (rule 9) — trust them going forward, but the first real test result should update this report if anything about the shape was wrong (timestamp format, `mgnRatio` scale, position category value).
- `marginRatioPct` assumes `mgnRatio` is a 0–1 fraction (×100 for display). If a real response shows it's already a percentage, or means something closer to "distance to liquidation" than "utilization," fix the label and the math together — don't just relabel.
- Position fetching uses category `"SPOT"` on the assumption that both crypto and rToken holdings live there together post the July 2026 Cross-Asset UTA launch. If rTokens actually return under a distinct category, Session 3's correlation engine (which needs to enumerate rToken holdings specifically) will surface that immediately.
- Session 3 is still open: correlation/beta engine (pull each rToken's underlying stock's pre-tokenization price history from a Yahoo-Finance-style source) + turning `/api/chat` into a tool-using agent that can call `getAccountAssets`/`getCurrentPositions` and the correlation engine mid-conversation, replacing the seed message's hand-written sample card with a real one.
- Everything else from Session 1's assumptions (target user, differentiation vs. prior art, hackathon deadline 2026-09-21, submission-materials checklist) still holds and wasn't re-verified this session.

---

## Session 3: Correlation/beta engine — keyless historical prices + stats
**Date:** 2026-09-18
**Goal:** Build and independently verify a correlation/beta engine (Yahoo-style historical closes -> aligned returns -> Pearson correlation and beta vs. a benchmark), exposed through one endpoint so it can be checked before Session 4 wires it into the chat agent. No agent/chat changes this session — that's Session 4, kept separate per the ruleset's one-feature-boundary rule.

**Pre-flight check:** Confirmed against Session 2's report — file tree, `AccountHeadline`/`bitget.ts` shape, and declared env vars all matched. No drift found.

**Files added/changed:**
- `lib/market-history.ts` — new: keyless daily-closes fetcher (Yahoo's unofficial `v8/finance/chart`), `underlyingYahooSymbol()` mapping a Bitget position symbol to the Yahoo ticker for its underlying asset
- `lib/correlation.ts` — new: pure functions — `dailyReturns`, `alignByDate`, `correlation` (Pearson), `beta` (cov/var vs. benchmark), `betaAndCorrelation` (convenience wrapper)
- `app/api/market/beta/route.ts` — new: `GET ?symbol=&benchmark=` — the verification surface for this session's engine, reusable by Session 4 rather than throwaway

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
│   └── api/
│       ├── chat/route.ts
│       ├── account/route.ts
│       └── market/beta/route.ts
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
│   ├── bitget.ts
│   ├── correlation.ts
│   ├── design-tokens.ts
│   ├── format.ts
│   ├── market-history.ts
│   ├── types.ts
│   └── utils.ts
└── public/
    └── logo.svg
```

**Dependencies declared:** unchanged — `market-history.ts`/`correlation.ts` use only built-in `fetch`/`Math`, no new package.

**Supabase schema state:** none (unchanged).

**Env vars required (cumulative):** unchanged from Session 2 — the correlation engine needs no API key.

**API endpoints live (cumulative):**
- `POST /api/chat` — unchanged, still no tool use
- `GET /api/account` — unchanged
- `GET /api/market/beta?symbol=&benchmark=` — new: `{ available: true, symbol, resolvedTicker, benchmark, beta, correlation, dataPoints }`, or `{ available: false, reason, message }` on any failure

**Known stubs/mocks/TODOs (cumulative):**
- Everything from Sessions 1–2 (seed message/sample card still static; `components/ui/*` hand-authored; Bitget field names/signing unverified against a live call)
- **New, and important: this session's data source itself is unverified against a live call.** The research tool available while building this is blocked by Yahoo's robots.txt from fetching `query1.finance.yahoo.com` directly, so `lib/market-history.ts` is verified only against multiple independent third-party implementations' documented request/response shape, not one real response. Test `GET /api/market/beta?symbol=NVDA` first thing next session — if it 429s or the shape is off, see the risk note at the top of `lib/market-history.ts` for the two fallback options.
- Stooq (the usual free/keyless fallback for this kind of data) started requiring an API key as of March 2026 — confirmed while researching this session, so it is **not** a fallback option without adding a key.
- `underlyingYahooSymbol()`'s rToken-detection regex has a known false-positive edge case: a crypto ticker that happens to start with "r" (e.g. a hypothetical RENDERUSDT) would incorrectly parse as an rToken and resolve to a nonexistent underlying ticker. Fails safely (returns "unavailable," not wrong data) but should become a proper allow-list of the known rToken set if it comes up.
- `/api/chat` still has no tool use — still Session 4's job, now with both `lib/bitget.ts` and this session's engine ready for it to call.

**Assumptions carried into next session:**
- `lib/market-history.ts` is this project's one-time-verify-then-trust pass for market data (rule 9) — but unlike the Bitget client, it could NOT be checked against even one real response while building it (robots.txt blocked the research tool). Treat it as higher-risk-unverified than Session 2's Bitget client until the first real test.
- Beta is computed against SPY as the default benchmark — the same convention used by comparable existing tools (see Session 1's prior-art note), not an arbitrary choice.
- Session 4 is still open: turn `/api/chat` into a tool-using agent that calls `getAccountAssets`/`getCurrentPositions` (Session 2) and `betaAndCorrelation`/`underlyingYahooSymbol` (this session) to answer real "what if I add X" questions, replacing `ChatShell`'s hand-written seed card with a real one built from live numbers. This is the session that finally makes the product's core loop real end to end — budget it as its own session rather than folding it into anything else, since it touches the agent loop, the tool schemas, and how `ChatShell` renders the result.
- Everything from Sessions 1–2's assumptions (target user, prior-art differentiation, hackathon deadline 2026-09-21, submission-materials checklist, `mgnRatio` scale/meaning, `SPOT` category assumption for positions) still holds and wasn't re-verified this session.

---

## Session 4: Tool-using agent — the core loop, end to end
**Date:** 2026-09-19
**Goal:** Turn `/api/chat` into a real tool-using agent that calls the Bitget client and the correlation engine to answer "what if I trade X" with a live, computed before/after impact — replacing the hand-written sample card with a real one. This is the session that makes the product's central claim real rather than illustrated.

**Pre-flight check:** Confirmed against Session 3's report — file tree, `getAccountAssets`/`getCurrentPositions` signatures, and `betaAndCorrelation`/`yahooTickerForCoin`-adjacent exports all matched. No drift found. (Note: this session ended up using `assets[].coin` directly rather than the positions-endpoint symbol format Session 3's `underlyingYahooSymbol` targets — see "New design decision" below.)

**New design decision — built on the *confirmed* endpoint, not the shakier one:** Session 2 confirmed `assets[].coin` (a bare ticker like "rNVDA", "BTC", "USDT") as a real field; the positions-endpoint symbol format `underlyingYahooSymbol` (Session 3) assumes ("rNVDAUSDT" style) was never confirmed. Rather than build the live product path on top of an unconfirmed assumption, this session added `yahooTickerForCoin()` (works on the bare coin ticker) and built the portfolio math on `getAccountAssets` alone. `getCurrentPositions` and `underlyingYahooSymbol` are unused by the live path now — kept in the codebase (not deleted) since they may still be useful once the positions-endpoint shape is actually confirmed, but the product no longer depends on that assumption holding.

**Files added/changed:**
- `lib/market-history.ts` — changed: added `yahooTickerForCoin(coin)`, the bare-ticker resolver the live path actually uses
- `lib/portfolio.ts` — new: `SECTOR_MAP` (Bitget's initial rToken set + major crypto), `computePortfolioImpact` (pure, deterministic — beta/concentration/collateral-headroom before vs. after), `previewTradeImpact` (orchestrates: live Bitget assets -> resolve each holding's beta/sector, tolerating individual failures -> compute impact)
- `lib/tools.ts` — new: Anthropic tool schemas (`get_portfolio_snapshot`, `preview_trade_impact`) + `runTool()` dispatcher that calls into `lib/portfolio.ts`/`lib/bitget.ts` and builds the `MetricDeltaCard` from a real result
- `app/api/chat/route.ts` — rewritten: proper tool-use loop (bounded at 4 rounds), returns `{ text, cards }`; system prompt updated to describe the two tools and require relaying caveats honestly
- `components/chat/ChatShell.tsx` — changed: removed the hand-written sample card from the seed message (replaced with a plain prompt-to-try-it greeting, since the real feature now exists); assistant messages now carry `cards` from the API response

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
│   └── api/
│       ├── chat/route.ts
│       ├── account/route.ts
│       └── market/beta/route.ts
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
│   ├── bitget.ts
│   ├── correlation.ts
│   ├── design-tokens.ts
│   ├── format.ts
│   ├── market-history.ts
│   ├── portfolio.ts
│   ├── tools.ts
│   ├── types.ts
│   └── utils.ts
└── public/
    └── logo.svg
```

**Dependencies declared:** unchanged — no new package.

**Supabase schema state:** none (unchanged).

**Env vars required (cumulative):** unchanged from Session 2 — `ANTHROPIC_API_KEY`, `BITGET_API_KEY`/`SECRET`/`PASSPHRASE`.

**API endpoints live (cumulative):**
- `POST /api/chat` — **changed**: now a tool-using agent (`{ text, cards: MetricDeltaCard[] }`), not a plain completion
- `GET /api/account` — unchanged
- `GET /api/market/beta?symbol=&benchmark=` — unchanged, still the standalone verification surface for the correlation engine

**Known stubs/mocks/TODOs (cumulative):**
- `components/ui/*` still hand-authored, not the real `shadcn/ui` package (unchanged)
- **Still unverified: no `npm install`/`npm run build` in this sandbox**, and this session is the biggest one yet to have never run for real (a multi-file agent loop with live tool calls). Ran the syntax-only `tsc` check again (clean), but a real build/run is now overdue — do this before anything else next session.
- `lib/market-history.ts`'s Yahoo endpoint is still unverified against one real response (Session 3's flag stands).
- `getCurrentPositions` and `underlyingYahooSymbol` (positions-endpoint symbol format) are now dead code on the live path — not deleted, but not exercised either. If the positions endpoint's real shape ever gets confirmed and is preferred over the assets-based approach, this is where to pick that back up.
- **Conversation history sent to `/api/chat` only carries plain text between turns, not the model's own prior tool calls/results.** Each request rebuilds Anthropic's message history from `ChatMessage.text` only (see `ChatShell.send()`), so on a follow-up turn the model sees its own past narration but not the raw numbers behind it. Fine for the "one trade idea per exchange" flow this is built for; would need real persistence of the Anthropic-format history to support "compare that to the NVDA one from earlier" cleanly.
- `computePortfolioImpact`'s "buy = fresh capital" and "sell = proceeds stay as cash" modeling choices are simplifications, surfaced to the user via the card's `note` (built from `impact.caveats`) rather than hidden — but they are simplifications, not Bitget's actual funding/settlement mechanics.
- Sector classification (`SECTOR_MAP`) only covers Bitget's initial rToken set plus major crypto; anything else falls back to "Other" rather than a guess.

**Assumptions carried into next session:**
- **Run a real build and a real end-to-end test before doing anything else.** This session went further without a real `npm run build` than any prior one — four new/changed files, one of them (`route.ts`) a genuine agent loop. If something's going to have broken, it's more likely here than in Sessions 1–3.
- Once a Bitget Demo API key and `ANTHROPIC_API_KEY` are both set, the actual test is: ask "what if I put $2,000 into rNVDA" and see whether a real card renders with plausible numbers. If `get_portfolio_snapshot`/`preview_trade_impact` report `connected: false` unexpectedly, check `.env.local` first.
- Next open work, in likely priority order given the 2026-09-21 deadline: (1) the real build/test above, (2) polish pass on error/empty states and the mobile layout for the demo recording, (3) the actual hackathon submission materials (project description's six parts, "Role of the LLM" field, the X post with `#BitgetHackathon` `@Bitget_AI`) — none of these are written yet and they take real time too, not just a checkbox.
- Everything from Sessions 1–3's assumptions (target user, prior-art differentiation, `mgnRatio` scale/meaning, `SPOT`-category assumption for the now-unused positions path) still holds and wasn't re-verified this session.

---

## Session 5: Submission materials draft (no code changes)
**Date:** 2026-09-19
**Goal:** Draft the actual hackathon submission content — the six-part Project Description, the "Role of the LLM" field, and X post options — since none of it existed yet and it takes real time, not just a checkbox, per Session 4's closing priority list.

**Files added:** `SUBMISSION_MATERIALS.md` (repo root) — draft project description, LLM-role field, two X post options, and a reminder on the University/Demo Day/K3 checkboxes. Bracketed placeholders remain for the deployed URL, repo link, and screen recording — everything else is written and grounded in what Sessions 1–4 actually built, not aspirational.

**Not touched this session:** no app code, no dependencies, no env vars, no endpoints — file tree, stack, and everything under "Known stubs/mocks/TODOs" in Session 4's entry all still stand exactly as written there.

**Assumptions carried into next session:**
- The Project Description's Section 4 ("Progress") describes the build as of Session 4 — if a real `npm install`/`build`/test turns up something broken, update that paragraph before submitting rather than describing a state that turned out not to hold.
- Still open, in priority order for the 2026-09-21 deadline: (1) the real build/test that every session since Session 1 has flagged as not yet run, (2) filling in `SUBMISSION_MATERIALS.md`'s three bracketed placeholders (deploy it, push it, record it), (3) a polish pass on error/empty states if time remains after (1) and (2).
- Everything from Sessions 1–4's assumptions still holds and wasn't re-verified this session.

---

## Session 6: Swapped chat model to Kimi K2 via Hugging Face — pre-demo
**Date:** 2026-09-19 (urgent — requested right before running the live demo)
**Goal:** Replace the Anthropic-backed chat model with Kimi K2, served through Hugging Face's Inference Providers router, with minimal disruption to the rest of the agent loop.

**Pre-flight check:** Confirmed against Session 5's report — file tree and `lib/tools.ts`'s `runTool`/`TOOL_DEFINITIONS` shape matched. No drift found.

**What changed and why it's a full rewrite, not a one-line model swap:** HF's router (`https://router.huggingface.co/v1/chat/completions`) is OpenAI-compatible, not Anthropic-compatible — Bearer auth instead of `x-api-key`, `tools` as `[{type:"function", function:{name, description, parameters}}]` instead of Anthropic's flatter shape, tool calls arrive as `message.tool_calls` on an assistant message instead of `tool_use` content blocks, and results go back as `{role:"tool", tool_call_id, content}` messages instead of a `tool_result` content block inside a user message. `runTool()` itself (the actual Bitget/portfolio logic) didn't need to change at all — only the request/response plumbing around it.

**Files added/changed:**
- `lib/tools.ts` — changed: added `OPENAI_TOOL_DEFINITIONS`, the same two tools converted to OpenAI function-calling shape; `TOOL_DEFINITIONS` (Anthropic shape) and `runTool()` left untouched
- `app/api/chat/route.ts` — rewritten: calls HF's router instead of Anthropic's API, OpenAI-style tool-call loop (still bounded at 4 rounds)
- `app/api/chat/route.anthropic-backup.ts` — new: the pre-Session-6 Claude-based route, kept as an inert file (Next.js only routes a file literally named `route.ts`) for a fast rollback — see "If tool-calling doesn't work" below
- `.env.example` — changed: `HF_TOKEN` (required) and `KIMI_MODEL` (optional override) added; `ANTHROPIC_API_KEY` commented out and marked as no longer read by any code, not deleted
- `README.md` — changed: setup instructions reference `HF_TOKEN` instead of `ANTHROPIC_API_KEY`

**Current full file tree:**
```
marginal/
├── .env.example
├── .gitignore
├── README.md
├── SESSION_REPORT.md
├── SUBMISSION_MATERIALS.md
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx
│   └── api/
│       ├── chat/
│       │   ├── route.ts
│       │   └── route.anthropic-backup.ts   (inert — not a route)
│       ├── account/route.ts
│       └── market/beta/route.ts
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
│   ├── bitget.ts
│   ├── correlation.ts
│   ├── design-tokens.ts
│   ├── format.ts
│   ├── market-history.ts
│   ├── portfolio.ts
│   ├── tools.ts
│   ├── types.ts
│   └── utils.ts
└── public/
    └── logo.svg
```

**Dependencies declared:** unchanged — plain `fetch`, no OpenAI SDK added (kept it dependency-free like the Anthropic version was, given no network access in this sandbox to verify a new package installs cleanly).

**Env vars required (cumulative, current):**
- `HF_TOKEN` — read by `app/api/chat/route.ts` as of this session
- `KIMI_MODEL` — optional, same file, defaults to `moonshotai/Kimi-K2-Instruct-0905`
- `BITGET_API_KEY`/`SECRET`/`PASSPHRASE` — unchanged, read by `lib/bitget.ts`
- `ANTHROPIC_API_KEY` — no longer read by any code (was Sessions 1–5's chat model)

**API endpoints live (cumulative):** unchanged surface — `POST /api/chat` (now Kimi K2via HF), `GET /api/account`, `GET /api/market/beta?symbol=&benchmark=`.

**Known stubs/mocks/TODOs (cumulative):**
- Everything from Session 4/5's list still stands (no real `npm install`/build has ever been run; Yahoo endpoint unverified against a live call; `mgnRatio` scale/meaning unconfirmed)
- **New and important, given this changed right before a demo: tool-calling support through HF's *default* auto-selected provider for `moonshotai/Kimi-K2-Instruct-0905` is not verified.** Kimi K2 itself has confirmed strong tool-calling per its model card, and the OpenAI-compatible shape this route sends matches Moonshot's own documented usage — but whether the specific provider HF's router picks by default actually honors the `tools` parameter (some providers on a router can lag the underlying model's capabilities) was not something this session could test live.
- **If tool-calling doesn't work in testing:** two fast options, in order of effort — (1) set `KIMI_MODEL=moonshotai/Kimi-K2-Instruct-0905:groq` in the environment to pin the specific provider Moonshot's own docs show working with `tools`/`tool_choice`, no code change needed; (2) roll back to Claude for the demo by swapping `route.ts` and `route.anthropic-backup.ts`'s contents (the backup is the exact working Session 5 file) and restoring `ANTHROPIC_API_KEY`.

**Assumptions carried into next session:**
- **Test this immediately, before the demo, not during it:** ask "what if I put $2,000 into rNVDA" and confirm a real tool call actually fires and a card renders. This is higher-risk-unverified than even Session 4's original agent loop, because it's a different provider's tool-calling implementation on top of everything Session 4 already carried as unverified.
- If the default HF provider doesn't call tools reliably, pin `:groq` via `KIMI_MODEL` first (no code change) before falling back further.
- Kimi K2's recommended `temperature` is 0.6, per its own model card — set as the default in this route; lower it if responses feel too loose for a demo.
- Everything else from Sessions 1–5's assumptions (target user, prior-art differentiation, Bitget field-shape uncertainties, submission-materials placeholders) still holds and wasn't re-verified this session.

---

## Session 7: Local "fetch failed" hotfix — IPv4 DNS resolution order
**Date:** 2026-09-19 (urgent — hit while testing Session 6 locally, right before the demo)
**Goal:** Fix `/api/chat` throwing "Couldn't reach the Hugging Face router" when running locally with `npm run dev`.

**What happened:** local testing of Session 6 hit the fetch-level catch block (not an HTTP error response — the request never landed). Most likely cause: Node resolving `router.huggingface.co` to an IPv6 address the local network can't route, while curl/browsers on the same machine fall back to IPv4 silently. Not yet confirmed by a terminal stack trace (the person testing hadn't shared one when this fix went in) — this is the highest-probability, zero-downside fix to try first, not a confirmed root cause.

**Files changed:**
- `app/api/chat/route.ts` — added `dns.setDefaultResultOrder("ipv4first")` at module load, before the Kimi K2 fetch logic

**Status: unconfirmed.** Whoever is running the local demo needs to fully restart `npm run dev` (this only takes effect at process start) and retest. If it still fails, the next step is reading the actual terminal stack trace, not another guess — candidates not yet ruled out: a corporate proxy Node's `fetch` doesn't pick up automatically, or something else entirely.

**Assumptions carried into next session:**
- If this fix didn't resolve it, do not add more speculative networking fixes blind — get the real error text first.
- Everything from Sessions 1–6 stands, unchanged by this one-line addition.
