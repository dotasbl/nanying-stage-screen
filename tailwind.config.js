/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Noto Sans TC",
          "Microsoft JhengHei",
          "PingFang TC",
          "Arial",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

