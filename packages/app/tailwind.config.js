/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "nearly-bg-color": "var(--nearly-bg-color)",
      },
      textColor: {
        "nostr-blue": "var(--repost)",
        "nostr-green": "var(--success)",
        "nostr-orange": "var(--zap)",
        "nostr-red": "var(--heart)",
        "nostr-purple": "var(--highlight)",
      },
      spacing: {
        px: "1px",
      },
    },
  },
  plugins: [],
};
