import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        memo: ["var(--font-memo)", "ui-monospace", "monospace"]
      },
      colors: {
        ink: "#000000",
        paper: "#ffffff",
        lime: "#dfff00",
        panel: "#ffffff",
        panelAlt: "#f4f4f4"
      }
    }
  },
  plugins: [typography]
};

export default config;
