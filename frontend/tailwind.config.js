/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Archivo", "system-ui", "sans-serif"],
      },
      colors: {
        paper: "#ffffff",
        canvas: "#f3f3f1",
        ink: {
          DEFAULT: "#0b0b0c",
          soft: "#2b2b2e",
        },
        mute: {
          DEFAULT: "#6f6f74",
          light: "#a3a3a8",
        },
        line: {
          DEFAULT: "#e6e6e3",
          strong: "#0b0b0c",
        },
        blood: {
          DEFAULT: "#d20a11",
          dark: "#a3080d",
        },
        win: "#11823b",
        gold: "#b8860b",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "draw-x": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        pulse: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.3 },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "draw-x": "draw-x 0.7s cubic-bezier(0.6, 0, 0.2, 1) both",
        "live-pulse": "pulse 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
