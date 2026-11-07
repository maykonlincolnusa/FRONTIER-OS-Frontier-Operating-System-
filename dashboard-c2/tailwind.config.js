/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        frontier: {
          darkest: "#070b12",
          dark: "#0b1320",
          card: "#111c2e",
          border: "#1e2f4a",
          accent: "#38bdf8",
          ring1: "#0ea5e9", // Maritime Blue
          ring2: "#f59e0b", // Federal Amber
          ring3: "#ef4444", // Interstate Red
          dea: "#a855f7",   // DEA Purple
        },
      },
    },
  },
  plugins: [],
};
