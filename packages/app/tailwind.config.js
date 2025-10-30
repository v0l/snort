/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      spacing: {
        px: "1px",
      },
      padding: {
        "footer-height": "calc(56px + env(safe-area-inset-bottom))",
      },
      animation: {
        "infinite-scroll": "infinite-scroll 25s linear infinite",
        "spin-slow": "spin-slow 2s linear infinite",
        "spinner-dash": "spinner-dash 1.5s ease-in-out infinite",
      },
      keyframes: {
        "infinite-scroll": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "spinner-dash": {
          "0%": {
            "stroke-dasharray": "0 150",
            "stroke-dashoffset": "0",
          },
          "47.5%": {
            "stroke-dasharray": "42 150",
            "stroke-dashoffset": "-16",
          },
          "95%": {
            "stroke-dasharray": "42 150",
            "stroke-dashoffset": "-59",
          },
          "100%": {
            "stroke-dasharray": "42 150",
            "stroke-dashoffset": "-59",
          },
        },
      },
    },
  },
};
