import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Ateliê Malu Ribeiro
        brand: {
          sand:       "#C8B9A8", // bege areia — cor dominante do logo
          "sand-light": "#E8DDD4", // areia clara — backgrounds de seção
          cream:      "#F5F0EB", // creme — background geral
          mauve:      "#B07A80", // rosa queimado — destaques, hover
          blush:      "#EDD9DC", // rosa pálido — fundos suaves
          "blush-light": "#F7EEEF", // rosa quase branco
          ink:        "#1A1A1A", // quase preto — textos e CTA
          text:       "#2E2020", // marrom escuro — corpo de texto
          muted:      "#7A6A6A", // cinza quente — labels
          line:       "#D9CACB", // bege cinza — bordas
          white:      "#FFFFFF",
        },
        // Status das peças
        status: {
          "open-bg":      "#FDF3E3",
          "open-text":    "#C9882A",
          "closed-bg":    "#EDD9DC",
          "closed-text":  "#B07A80",
          "paid-bg":      "#E8F2EC",
          "paid-text":    "#4A8A62",
          "cancelled-bg": "#F2EAEA",
          "cancelled-text":"#7A6A6A",
        },
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        body:    ["var(--font-inter)", "system-ui", "sans-serif"],
        script:  ["var(--font-dancing)", "cursive"],
      },
      borderRadius: {
        DEFAULT: "8px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(44, 32, 26, 0.08), 0 1px 2px -1px rgba(44, 32, 26, 0.06)",
        "card-hover": "0 4px 12px 0 rgba(44, 32, 26, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
