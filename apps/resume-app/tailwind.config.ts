import type { Config } from "tailwindcss";

// Colors sampled directly from `docs/prototype/pencil-new.pen`.
// Adjust here — components use tokens, not hex literals.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EBF3FF", // active nav pill background
          500: "#0066FF", // primary blue (buttons, logo, edit circle, active nav text)
          600: "#0052D6", // hover state
        },
        ink: {
          900: "#1D102C", // headings, dark Download button
          700: "#5C5564", // body text, English descriptions
          500: "#8B8297", // inactive nav, Chinese descriptions, placeholder name
          300: "#A29BAB", // input placeholder text
        },
        surface: {
          DEFAULT: "#F5F7FA", // page background, modal close button bg
          card: "#FFFFFF", // white cards, top nav, modal, edit panel
          muted: "#F8F6F3", // input fields, resume dropdown
          tag: "#F0ECE7", // detail-tag chips, photo circle bg
        },
      },
      borderRadius: {
        card: "24px", // personal card, modal
        button: "16px", // primary buttons (Add Content, Done)
        pill: "999px",
      },
      boxShadow: {
        card: "0 4px 16px rgba(29,16,44,0.06)",
        cardHover: "0 8px 24px rgba(29,16,44,0.10)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "PingFang SC",
          "Hiragino Sans GB",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
