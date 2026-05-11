/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        jp: ['"Noto Sans JP"', '"Hiragino Sans"', '"Yu Gothic"', "sans-serif"],
      },
      colors: {
        // Space-separated RGB tuples so opacity modifiers (bg-ink-900/80) work.
        // Values are defined as CSS custom properties in index.css and flip on .light.
        //
        // Semantic text-color aliases -- prefer these over raw ink steps in components:
        //   text-primary (ink-100), text-secondary (ink-300), text-dim (ink-400),
        //   text-muted (ink-500), text-subtle (ink-600)
        primary: "rgb(var(--ink-100) / <alpha-value>)",
        secondary: "rgb(var(--ink-300) / <alpha-value>)",
        dim: "rgb(var(--ink-400) / <alpha-value>)",
        muted: "rgb(var(--ink-500) / <alpha-value>)",
        subtle: "rgb(var(--ink-600) / <alpha-value>)",
        ink: {
          950: "rgb(var(--ink-950) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
        },
        accent: {
          paper: "rgb(var(--accent-paper) / <alpha-value>)",
          gold: "rgb(var(--accent-gold) / <alpha-value>)",
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
