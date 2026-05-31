/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "vibrant-purple": "#8b5cf6",
        "vibrant-indigo": "#6366f1",
        "vibrant-pink": "#ec4899",
        "vibrant-cyan": "#06b6d4",
        "vibrant-emerald": "#10b981",
        "vibrant-amber": "#f59e0b",
        "vibrant-rose": "#f43f5e",
        "zinc-850": "#222225"
      }
    }
  },
  plugins: []
};
