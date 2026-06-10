import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: "#17BDB0",
          light: "#E0F7F5",
          dark: "#0F8A80",
          50: "#F0FFFE",
          100: "#CCFBF7",
          500: "#17BDB0",
          600: "#0F8A80",
        },
        navy: {
          DEFAULT: "#1A2B4A",
          light: "#2D4470",
          50: "#EFF4FF",
          100: "#D1DDF7",
        },
        coral: {
          DEFAULT: "#FF6B7A",
          light: "#FFE8EA",
        },
      },
      fontFamily: {
        sans: ["var(--font-heebo)", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(145deg, #E0F7F5 0%, #F0FFFE 35%, #EFF6FF 70%, #F8F4FF 100%)",
        "dark-gradient":
          "linear-gradient(160deg, #1A2B4A 0%, #0F3054 50%, #1A3A4A 100%)",
        "teal-gradient":
          "linear-gradient(135deg, #17BDB0 0%, #0891B2 50%, #6366F1 100%)",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out 2s infinite",
        "fade-up": "fadeUp 0.6s ease forwards",
        "spin-slow": "spin 12s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
