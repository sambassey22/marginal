/**
 * Marginal — design token system
 * ---------------------------------
 * Logged per AGENT_BUILD_RULESET.md Section 8. Mirrored into
 * tailwind.config.ts (Tailwind reads its config at build time, so the hex
 * values are duplicated there — this file is the documented source of truth
 * and the thing to edit first).
 *
 * Brief: a pre-trade portfolio-impact copilot for a Bitget Cross-Asset
 * Unified Trading Account (crypto + rToken). Audience: an active retail/
 * prosumer rToken trader who already holds both crypto and tokenized-stock
 * positions and wants a gut check before adding to the book. Judged in a
 * 3–5 minute demo on feature depth, research quality, LUI fluency, and
 * personalized thesis — the interface itself is part of the deliverable.
 *
 * Rejected defaults (see AGENT_BUILD_RULESET.md 8.4 / frontend-design skill):
 * cream+terracotta serif, near-black+neon-green "crypto app" look, SaaS
 * card-kit with uniform shadows, broadsheet hairline layout, purple-blue
 * gradient hero. Also rejected: pure red/green neon commonly used by crypto
 * trading UIs — kept the red/green *convention* (it's a financial-literacy
 * standard, not an AI tell) but desaturated and repositioned both against a
 * navy (not black) base with a warm brass accent doing the interactive work.
 */

export const palette = {
  ink950: "#0D1321", // page background — deep ink navy, not pure black
  ink900: "#12192B", // raised surface (ticker strip, input bar)
  ink800: "#161D30", // card surface
  ink700: "#2A3350", // hairline border
  paper100: "#EDEFF5", // primary text — soft off-white, not pure white
  paper400: "#8B93AC", // muted / secondary text
  signalUp: "#3FB88F", // gains, safer deltas — muted jade, not neon green
  signalDown: "#D65F53", // losses, riskier deltas — muted brick, not alarm red
  signalBrass: "#E8B34C", // the single interactive accent: CTAs, focus rings, active tab
} as const;

export const typePairing = {
  display: "Space Grotesk", // headings, wordmark — geometric, slightly technical
  body: "IBM Plex Sans", // prose — engineered character, distinct from the ubiquitous Inter
  numeric: "IBM Plex Mono", // every number in the product — tabular figures, no digit jitter on update
} as const;

export const layoutParadigm =
  "Single-column chat thread (max ~760px) with a sticky ticker-strip header " +
  "showing live account headlines. The AI's structured analysis renders as " +
  "inline rich cards inside the conversation, not a separate dashboard route " +
  "— the LUI *is* the dashboard.";

export const signatureElement =
  "Inline impact-preview card: a compact before\u2192after bar for each " +
  "affected metric (beta, concentration, margin headroom), animating a " +
  "single draw-in fill on arrival and otherwise still.";

export const motionConcept =
  "One draw-in animation per impact card on arrival (respects " +
  "prefers-reduced-motion by skipping to the final state). No hover " +
  "transitions, no scroll reveals.";

export const logoApproach =
  "Typographic wordmark 'Marginal' in Space Grotesk Medium, tightened " +
  "tracking. One geometric modification: the lowercase 'g' bowl is squared " +
  "into a small ascending three-bar mark, doubling as a favicon-scale " +
  "monogram.";
