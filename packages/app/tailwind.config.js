/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "nearly-bg-color": "var(--nearly-bg-color)",
        "border-color": "var(--border-color)",
        highlight: "var(--highlight)",
        "bg-color": "var(--bg-color)",
        "bg-secondary": "var(--bg-secondary)",
        "nostr-blue": "var(--repost)",
        "nostr-green": "var(--success)",
        "nostr-orange": "var(--zap)",
        "nostr-red": "var(--heart)",
        "nostr-purple": "var(--highlight)",
        secondary: "var(--font-secondary-color)",
      },
      spacing: {
        px: "1px",
      },
      padding: {
        "footer-height": "calc(56px + env(safe-area-inset-bottom))",
      },
      backgroundColor: {
        header: "var(--header-bg-color)",
      },
    },
  },
  plugins: [],
};
