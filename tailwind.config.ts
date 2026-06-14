import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0F172A",
          raised: "#1E293B",
          card: "#1E293B",
          border: "rgba(148, 163, 184, 0.12)",
        },
        accent: {
          DEFAULT: "#3B82F6",
          muted: "#2563EB",
          secondary: "#8B5CF6",
        },
        bullish: "#22C55E",
        bearish: "#EF4444",
        neutral: "#CBD5E1",
        muted: "#94A3B8",
        warning: "#F59E0B",
        text: {
          DEFAULT: "#F8FAFC",
          secondary: "#CBD5E1",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        mono: ["Pretendard Variable", "Pretendard", "monospace"],
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        card: "0 4px 24px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(0, 0, 0, 0.1)",
        "card-hover": "0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 4px rgba(0, 0, 0, 0.12)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-up": "slideUp 0.35s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
