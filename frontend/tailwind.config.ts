import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#111111",
        panelAlt: "#1a1a1a"
      }
    }
  },
  plugins: [typography]
};

export default config;
