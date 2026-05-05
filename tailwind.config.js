/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        jp: ['"Noto Sans JP"', '"Hiragino Sans"', '"Yu Gothic"', "sans-serif"],
        ui: ['"Inter"', "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#0b0c0f",
          900: "#101218",
          800: "#1a1d26",
          700: "#262a36",
          500: "#5a6078",
          300: "#a8aec2",
          100: "#e8eaf2",
        },
        accent: {
          paper: "#e8dccd",
          gold: "#d4a857",
          rose: "#d97a82",
          sky: "#7aa8d9",
          moss: "#8fb37a",
          plum: "#a880d4",
        },
      },
    },
  },
  plugins: [],
};
