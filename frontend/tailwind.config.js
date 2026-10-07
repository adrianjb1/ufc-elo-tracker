/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Big Shoulders Display"', "Impact", "sans-serif"],
        sans: ["Archivo", "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        paper: "#faf8f3",
        canvas: "#ebe7dd",
        ink: {
          DEFAULT: "#111111",
          soft: "#33312d",
          raised: "#1c1c1c",
        },
        mute: {
          DEFAULT: "#6e6a62",
          light: "#a39e93",
        },
        line: {
          DEFAULT: "#dcd6ca",
          dark: "#333333",
        },
        blood: {
          DEFAULT: "#d20a11",
          light: "#ff3b3f",
        },
        win: {
          DEFAULT: "#13773a",
          light: "#3ddc84",
        },
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
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulse: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.3 },
        },
        stamp: {
          "0%": { opacity: 0, transform: "scale(1.6) rotate(-14deg)" },
          "60%": { opacity: 1, transform: "scale(0.95) rotate(-8deg)" },
          "100%": { opacity: 1, transform: "scale(1) rotate(-8deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "draw-x": "draw-x 0.8s cubic-bezier(0.6, 0, 0.2, 1) both",
        marquee: "marquee 60s linear infinite",
        "live-pulse": "pulse 1.8s ease-in-out infinite",
        stamp: "stamp 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) 0.3s both",
      },
    },
  },
  plugins: [],
};
