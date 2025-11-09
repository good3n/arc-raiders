/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}", "./public/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Barlow", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
