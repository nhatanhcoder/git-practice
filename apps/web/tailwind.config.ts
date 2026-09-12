import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Student prototype tokens (mockup mode — allowed by docs/prompts/student-product)
        // Student area palette — the Hán Lộ "mực & chu sa" set, dark.
        //
        // These names are roles, not colours, which is the only reason re-theming the whole
        // learner area was a single-file change: 695 class usages across 11 files inherit
        // whatever these values are. Nothing was rewritten at the call sites.
        //
        // Values are plain hex on purpose. 17 usages carry a Tailwind opacity modifier
        // (bg-sp-primary/20 and similar), and Tailwind can only inject alpha into a colour it
        // can parse — pointing these at var(--x) or rgba() would silently break those 17.
        //
        // Mapped from src/styles/hanlu/tokens.css (.student-root[data-theme="dark"]) so the
        // learner area, the landing page and the auth screens read as one product.
        sp: {
          bg: "#0A0D13", // --bg
          card: "#121722", // --surface
          line: "#253044", // --line
          ink: "#EEF2F8", // --text-1
          ink2: "#A9B4C6", // --text-2
          ink3: "#77839A", // --text-3
          primary: "#FF7454", // --cinnabar-400
          "primary-strong": "#F0532F", // --cinnabar-500
          "primary-soft": "#2B1A15", // cinnabar laid over --bg, opaque so /nn still works
          "primary-line": "#5C3627",
          accent: "#F5B942", // --gold-400 — the second accent, kept distinct from primary
          "accent-strong": "#DC9A1C", // --gold-500
          "accent-soft": "#2B2416",
          ok: "#35C795", // --jade-400
          "ok-soft": "#10281F",
          warn: "#F5B942", // --gold-400
          "warn-soft": "#2B2416",
          danger: "#FF6B81", // --rose-400
          "danger-soft": "#2D1820",
          xp: "#F5B942", // --gold-400
          "xp-soft": "#2B2416",
          streak: "#FF9C86", // --cinnabar-300
          locked: "#77839A", // --text-3
          "locked-soft": "#19202D", // --surface-2
          boss: "#8E7CFF", // --violet-400
          "boss-soft": "#221D33",
        },
      },
      fontFamily: {
        sp: ["Nunito", "system-ui", "sans-serif"],
        spbody: ["'DM Sans'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        sp: "0 1px 2px rgba(30,27,75,0.04), 0 16px 40px -20px rgba(30,27,75,0.18)",
        "sp-sm": "0 1px 2px rgba(30,27,75,0.06)",
      },
    },
  },
  plugins: [
    // Custom classes composed with the sp-* utilities in components/student/*.
    // Defined here — not in a stylesheet stack — so they resolve on every route
    // that compiles Tailwind, independent of which CSS stack is loaded.
    // (sp-press/sp-font-head were used 14× with no definition anywhere.)
    plugin(({ addComponents }) => {
      addComponents({
        ".sp-font-head": { fontFamily: "Nunito, system-ui, sans-serif" },
        ".sp-press": { transition: "transform .12s ease" },
        ".sp-press:active:not(:disabled)": { transform: "translateY(1px)" },
      });
    }),
  ],
};
export default config;
