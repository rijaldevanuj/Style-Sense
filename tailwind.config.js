/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/constants/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#000000",
        secondary: "#1A1A1A",
        tertiary: "#4D4D4D",
        "neutral-bg": "#F0F0F0",
        "accent-destructive": "#A31D1D",
      },
      fontFamily: {
        serif: ["Noto Serif"],
        sans: ["Inter"],
      },
    },
  },
  plugins: [],
};
