/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}', './public/**/*.{html,js}'],
  theme: {
    colors: {
      dark: '#130918',
      // light: "#ece2d0",
      light: '#F9EFDE',
      blue: '#5FFFFF',
      green: '#05FF74',
      red: '#FF0000',
      yellow: '#FFEA00',
      orange: '#EBA416',
      itemGray: '#4b5563',
      itemGreen: '#16a34a',
      itemBlue: '#2563eb',
      itemPurple: '#9333ea',
      itemOrange: '#ea580c',
    },
    container: {
      center: true,
      padding: '16px',
      screens: {
        md: '100%',
        lg: '1300px',
      },
    },
    extend: {
      backgroundImage: {
        siteBackground: "url('/src/assets/images/background.jpg')",
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
