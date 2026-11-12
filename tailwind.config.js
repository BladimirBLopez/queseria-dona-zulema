/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Quesería y Fiambrería Doña Zulema: vino, oro y crema
        vino: { 50: '#fdf3f2', 100: '#fbe3e0', 200: '#f6c7c2', 300: '#ee9f98', 400: '#e1695f', 500: '#cf4237', 600: '#b02c26', 700: '#8f1f1f', 800: '#7a1414', 900: '#5e0d0d', 950: '#3b0909' },
        oro: { 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
        crema: { DEFAULT: '#fbf6ec', 100: '#f5ecd9' },
        panel: { DEFAULT: '#fbf6ec', 100: '#f5ecd9' },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(59,9,9,.06), 0 8px 24px -12px rgba(59,9,9,.18)',
        lift: '0 2px 4px rgba(59,9,9,.08), 0 20px 40px -16px rgba(59,9,9,.25)',
      },
    },
  },
  plugins: [],
};
