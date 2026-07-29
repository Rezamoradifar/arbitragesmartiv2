/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Primary — kept from the original brand so the identity carries over.
        brand: {
          50: "#eefcf7",
          100: "#d5f7ea",
          200: "#adeed7",
          300: "#75dfbe",
          400: "#3ec89f",
          500: "#1aab84",
          600: "#10896a",
          700: "#0f6d57",
          800: "#0f5747",
          900: "#0d483c",
          950: "#052922",
        },
        // Secondary — used sparingly on governance and risk surfaces so those
        // read as a different class of thing from the money-green.
        iris: {
          300: "#a5b4ff",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          900: "#1e1b4b",
          950: "#141033",
        },
        // Base — near-black with a blue undertone. Flat neutral slate is what
        // made the previous build feel lifeless.
        ink: {
          50: "#f6f7fb",
          200: "#c9cfe0",
          300: "#9aa3bd",
          400: "#6e7896",
          600: "#333c58",
          700: "#242c44",
          800: "#171d30",
          850: "#121729",
          900: "#0d1120",
          950: "#070a16",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(62,200,159,.18), 0 12px 40px -12px rgba(26,171,132,.35)",
        "glow-lg": "0 0 0 1px rgba(62,200,159,.25), 0 30px 80px -20px rgba(26,171,132,.45)",
        lift: "0 20px 50px -24px rgba(0,0,0,.9)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,.045) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "56px 56px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(0,-24px,0) scale(1.06)" },
        },
        drift: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(22px,18px,0) scale(.94)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(.85)", opacity: "0.7" },
          "70%,100%": { transform: "scale(1.9)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up .7s cubic-bezier(.16,1,.3,1) both",
        float: "float 16s ease-in-out infinite",
        drift: "drift 20s ease-in-out infinite",
        shimmer: "shimmer 2.6s linear infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(.24,.8,.4,1) infinite",
      },
    },
  },
  plugins: [],
};
