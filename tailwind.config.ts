import type { Config } from "tailwindcss";

// Colori presi dal "Tema A" del CRM Nautilus EVO (vedi app/globals.css):
// tutti i colori passano da variabili CSS, così tema chiaro e scuro restano coerenti.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        hover: v("hover"),
        line: v("line"),
        "line-strong": v("line-strong"),
        ink: v("ink"),
        "ink-soft": v("ink-soft"),
        "ink-faint": v("ink-faint"),
        navy: v("navy"),
        "navy-deep": v("navy-deep"),
        "navy-hover": v("navy-hover"),
        gold: v("gold"),
        "gold-soft": v("gold-soft"),
        aqua: v("aqua"),
        ok: v("ok"),
        warn: v("warn"),
        danger: v("danger"),
        info: v("info"),
      },
      fontFamily: {
        sans: ["var(--font-ui)"],
        display: ["var(--font-display)"],
      },
      borderRadius: { DEFAULT: "6px" },
      boxShadow: { card: "0 1px 3px rgba(10,20,40,.06)", pop: "0 12px 32px rgba(10,20,40,.22)" },
    },
  },
  plugins: [],
};
export default config;
