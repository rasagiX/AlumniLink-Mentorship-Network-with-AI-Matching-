import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        ink:          "hsl(var(--ink)          / <alpha-value>)",
        paper:        "hsl(var(--paper)        / <alpha-value>)",
        surface:      "hsl(var(--surface)      / <alpha-value>)",
        surface2:     "hsl(var(--surface2)     / <alpha-value>)",
        line:         "hsl(var(--line)         / <alpha-value>)",
        muted:        "hsl(var(--muted)        / <alpha-value>)",
        accent:       "hsl(var(--accent)       / <alpha-value>)",
        "accent-dim": "hsl(var(--accent-dim)   / <alpha-value>)",
        "accent-ink": "hsl(var(--accent-ink)   / <alpha-value>)",
        success:      "hsl(var(--success)      / <alpha-value>)",
        warning:      "hsl(var(--warning)      / <alpha-value>)",
        danger:       "hsl(var(--danger)       / <alpha-value>)",
        "role-student":"hsl(var(--role-student)/ <alpha-value>)",
        "role-mentor": "hsl(var(--role-mentor) / <alpha-value>)",
        "role-admin":  "hsl(var(--role-admin)  / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans:    ["var(--font-sans)",    "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)",    "monospace"],
      },
      maxWidth: { content: "1280px" },
      borderRadius: { sm: "4px", md: "6px", lg: "10px", xl: "14px", "2xl": "18px" },
      boxShadow: {
        glow:    "0 0 24px hsl(var(--accent) / 0.25)",
        "glow-lg":"0 0 48px hsl(var(--accent) / 0.2)",
        card:    "0 1px 3px hsl(0 0% 0% / 0.35), 0 1px 2px hsl(0 0% 0% / 0.25)",
        "card-hover":"0 4px 16px hsl(0 0% 0% / 0.4), 0 1px 4px hsl(0 0% 0% / 0.3)",
        "sheet": "0 20px 60px hsl(0 0% 0% / 0.6)",
      },
      keyframes: {
        wave: { "0%,100%": { transform: "scaleY(0.3)" }, "50%": { transform: "scaleY(1)" } },
        "pulse-ring": {
          "0%":   { boxShadow: "0 0 0 0   hsl(var(--danger)/0.45)" },
          "100%": { boxShadow: "0 0 0 8px hsl(var(--danger)/0)" },
        },
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        wave:         "wave 1s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-up":    "fade-up 0.4s ease-out both",
        shimmer:      "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
