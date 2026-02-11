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
        sans: ['Poppins', 'Poppins Fallback', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.875rem', { lineHeight: '1.25rem' }],     // 12px -> 14px
        'sm': ['1rem', { lineHeight: '1.5rem' }],          // 14px -> 16px
        'base': ['1.125rem', { lineHeight: '1.75rem' }],   // 16px -> 18px
        'lg': ['1.25rem', { lineHeight: '1.75rem' }],      // 18px -> 20px
        'xl': ['1.5rem', { lineHeight: '2rem' }],          // 20px -> 24px
        '2xl': ['1.875rem', { lineHeight: '2.25rem' }],    // 24px -> 30px
        '3xl': ['2.25rem', { lineHeight: '2.5rem' }],      // 30px -> 36px
        '4xl': ['3rem', { lineHeight: '1' }],              // 36px -> 48px
        '5xl': ['3.75rem', { lineHeight: '1' }],           // 48px -> 60px
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
