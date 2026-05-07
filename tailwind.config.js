/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        moss: "#355b48",
        mint: "#dff3e7",
        amber: "#d38a28",
        line: "#d9e2dc",
        paper: "#fbfcf8"
      }
    },
  },
  plugins: [],
};
