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
          DEFAULT: "#0d1117",
          raised: "#161b22",
          card: "#1c2128",
          border: "#30363d",
        },
        accent: {
          DEFAULT: "#f0b429",
          muted: "#c9a227",
        },
        bullish: "#3fb950",
        bearish: "#f85149",
        neutral: "#8b949e",
      },
      fontFamily: {
        sans: ["system-ui", "Segoe UI", "sans-serif"],
        mono: ["Consolas", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
