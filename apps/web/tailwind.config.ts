import type { Config } from "tailwindcss";

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
        sp: {
          bg: "#F5F6FC",
          card: "#FFFFFF",
          line: "#E4E7F5",
          ink: "#1E1B4B",
          ink2: "#4B4D63",
          ink3: "#8B8DA3",
          primary: "#4F46E5",
          "primary-strong": "#4338CA",
          "primary-soft": "#EEF0FE",
          "primary-line": "#C7D2FE",
          accent: "#EA580C",
          "accent-strong": "#C2410C",
          "accent-soft": "#FDEEE2",
          ok: "#16A34A",
          "ok-soft": "#E8F6EE",
          warn: "#D97706",
          "warn-soft": "#FCF3E1",
          danger: "#DC2626",
          "danger-soft": "#FBEAEA",
          xp: "#F59E0B",
          "xp-soft": "#FEF3DC",
          streak: "#F97316",
          locked: "#9AA0B0",
          "locked-soft": "#F0F1F6",
          boss: "#7C3AED",
          "boss-soft": "#F1EAFE",
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
  plugins: [],
};
export default config;
