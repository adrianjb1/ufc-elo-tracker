/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', "Impact", "sans-serif"],
        cond: ['"Barlow Condensed"', "Arial Narrow", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#08080a",
          900: "#0f0f12",
          850: "#141418",
          800: "#1a1a1f",
          700: "#26262d",
          600: "#3a3a44",
        },
        blood: {
          DEFAULT: "#e5172f",
          light: "#ff4d5e",
          dark: "#9e0f20",
        },
        gold: {
          DEFAULT: "#e8b54a",
          light: "#f7d78a",
          dark: "#a87a1f",
        },
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "grow-x": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        "pop-in": {
          "0%": { opacity: 0, transform: "scale(0.96) translateY(8px)" },
          "100%": { opacity: 1, transform: "scale(1) translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.35 },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        shimmer: "shimmer 3.5s linear infinite",
        marquee: "marquee 40s linear infinite",
        "spin-slow": "spin-slow 120s linear infinite",
        "grow-x": "grow-x 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "pop-in": "pop-in 0.25s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "live-pulse": "pulse 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
