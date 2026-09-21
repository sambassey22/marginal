# Marginal

A pre-trade portfolio-impact copilot for a Bitget Cross-Asset Unified Trading
Account (crypto + tokenized US stocks / rToken). Built for the **AI Trading
Desk** track of Bitget AI Base Camp Hackathon S2 (Open Theme / Portfolio
Copilot angle).

**What it does:** you describe a position you're considering, and it shows
how the trade would change your book — beta, sector concentration, and
margin/collateral headroom — before you place it. Bitget's July 2026
Cross-Asset UTA update lets crypto and rTokens share one margin pool and lets
rTokens serve as collateral; this is the first thing built specifically
around that mechanic rather than treating it as a generic crypto portfolio
dashboard.

## Status

This is Session 1 of a session-based build (see `AGENT_BUILD_RULESET.md` /
`SESSION_REPORT.md`): the chat shell, the signature impact-preview card, and
the design system are real. The account connection and the actual impact
math are Session 2 — everything data-related right now is clearly marked
demo data.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

> This project was scaffolded without network access to `npm install` or
> run a build — the code has been written carefully but not yet compiled.
> Run `npm run build` right after `npm install` to catch anything before
> continuing to Session 2.

## Deploy

Any Next.js host works; Vercel is the path of least resistance:

```bash
npx vercel
```

Set `ANTHROPIC_API_KEY` (and, from Session 2 on, the `BITGET_*` variables)
in the host's environment settings — see `.env.example` for what each one
is for.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind. No database, no auth, no
monorepo — this product has no user accounts and nothing to persist across
sessions, so that infrastructure would cost build time without earning it
back in a 3-day hackathon window. Hand-authored UI primitives stand in for
`shadcn/ui` for the same network-access reason noted above; they're styled
to the same spec and can be swapped for the real package later with
`npx shadcn@latest add button card input` if wanted.
