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
        /**
         * Gold carries value: balances, yield, the primary action. It is the
         * scarcest ink on the page precisely so it still means something when
         * it appears — spread across every surface it would read as costume
         * jewellery rather than as money.
         */
        gold: {
          50: "#fdf9ed",
          100: "#faf0d0",
          200: "#f4df9c",
          300: "#ebc766",
          400: "#e0ad3c",
          500: "#d0932a",
          600: "#b3741f",
          700: "#8d551c",
          800: "#74441e",
          900: "#62391d",
          950: "#391d0c",
        },
        /**
         * Electric blue carries movement: data, network, links, anything in
         * flight. Pairing it against gold keeps "what I own" and "what the
         * system is doing" visually separate without a third hue.
         */
        volt: {
          50: "#eef6ff",
          100: "#d9ebff",
          200: "#bcdcff",
          300: "#8ec7ff",
          400: "#59a7ff",
          500: "#3384fb",
          600: "#1d63f0",
          700: "#164ddc",
          800: "#1840b2",
          900: "#1a3b8c",
          950: "#152555",
        },
        /**
         * Graphite: near-black with a cool cast rather than pure #000, which
         * flattens on OLED and leaves no room to raise a surface. Each step
         * is a distinct elevation, so depth comes from the palette instead of
         * from borders everywhere.
         */
        graphite: {
          50: "#f4f6f9",
          100: "#e6eaf1",
          200: "#c8d0de",
          300: "#9aa6bc",
          400: "#6b7791",
          500: "#4b5670",
          600: "#38405a",
          700: "#2a3048",
          750: "#212639",
          800: "#191d2c",
          850: "#131622",
          900: "#0d0f18",
          925: "#090a11",
          950: "#05060b",
        },
        // Semantic aliases so state colours are not hand-picked per component.
        success: { 400: "#34d399", 500: "#10b981", 600: "#059669" },
        danger: { 400: "#f87171", 500: "#ef4444", 600: "#dc2626" },
        warn: { 400: "#fbbf24", 500: "#f59e0b" },
      },
      boxShadow: {
        // Glass surfaces: a hairline plus a deep, soft drop. The inset top
        // highlight is what makes a panel read as lit from above.
        glass:
          "inset 0 1px 0 0 rgba(255,255,255,.06), 0 1px 2px 0 rgba(0,0,0,.4), 0 24px 48px -24px rgba(0,0,0,.9)",
        "glass-lg":
          "inset 0 1px 0 0 rgba(255,255,255,.08), 0 2px 4px 0 rgba(0,0,0,.5), 0 48px 96px -32px rgba(0,0,0,.95)",
        gold: "0 0 0 1px rgba(224,173,60,.25), 0 8px 32px -8px rgba(224,173,60,.35)",
        "gold-lg": "0 0 0 1px rgba(224,173,60,.35), 0 20px 64px -16px rgba(224,173,60,.45)",
        volt: "0 0 0 1px rgba(51,132,251,.25), 0 8px 32px -8px rgba(51,132,251,.4)",
        lift: "0 32px 64px -32px rgba(0,0,0,.95)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, rgba(255,255,255,.028) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,.028) 1px, transparent 1px)",
        "gold-sheen":
          "linear-gradient(135deg, #f4df9c 0%, #e0ad3c 38%, #b3741f 62%, #ebc766 100%)",
        "volt-sheen": "linear-gradient(135deg, #8ec7ff 0%, #3384fb 50%, #164ddc 100%)",
      },
      backgroundSize: { grid: "64px 64px" },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        float: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(0,-28px,0) scale(1.05)" },
        },
        drift: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(26px,20px,0) scale(.95)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(.85)", opacity: ".7" },
          "70%,100%": { transform: "scale(1.9)", opacity: "0" },
        },
        // Data travelling along a path — used by the network visuals.
        "dash-flow": { to: { strokeDashoffset: "-200" } },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "fade-up": "fade-up .8s cubic-bezier(.16,1,.3,1) both",
        "fade-in": "fade-in .9s ease both",
        float: "float 18s ease-in-out infinite",
        drift: "drift 22s ease-in-out infinite",
        shimmer: "shimmer 2.8s linear infinite",
        "pulse-ring": "pulse-ring 2.6s cubic-bezier(.24,.8,.4,1) infinite",
        "dash-flow": "dash-flow 3s linear infinite",
        "spin-slow": "spin-slow 40s linear infinite",
      },
    },
  },
  plugins: [],
};
