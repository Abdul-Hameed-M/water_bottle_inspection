/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          dark: "#0A0A0A",
          gray: "#1C1C1C",
          light: "#F9F9F9",
          border: "#E5E5E5",
          accent: "#3B82F6",
        },
        pass: "#22C55E",
        fail: "#EF4444",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
        heading: ["Inter", "sans-serif"],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
