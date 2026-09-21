import type { Config } from "tailwindcss";

// Token source of truth: lib/design-tokens.ts (Section 8 brainstorm, logged in
// SESSION_REPORT.md style history). Colors are duplicated here as static hex
// because Tailwind reads this file at build time, not at runtime.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0D1321", // page background
          900: "#12192B", // raised surface
          800: "#161D30", // card surface
          700: "#2A3350", // hairline / border
        },
        paper: {
          100: "#EDEFF5", // primary text
          400: "#8B93AC", // muted text
        },
        signal: {
          up: "#3FB88F",   // safer / gain
          down: "#D65F53", // riskier / loss
          brass: "#E8B34C", // the one interactive accent — CTAs, focus rings, active states
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        num: ["var(--font-num)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
      keyframes: {
        "bar-fill": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "bar-fill": "bar-fill 480ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
