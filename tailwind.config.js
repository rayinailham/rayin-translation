import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        // Define simple semantic colors if needed, but standard Tailwind palette works well.
        // We can leverage dark: clases.
        dark: {
            bg: '#18181b', // zinc-900 / jet-ish
            surface: '#27272a', // zinc-800
        }
      }
    },
  },
  plugins: [
    typography,
  ],
}
