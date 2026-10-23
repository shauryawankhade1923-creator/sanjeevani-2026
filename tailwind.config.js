/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#F4F7F4',
          100: '#E8EFE9',
          200: '#DCE6DE',
          300: '#CAD9CD',
          400: '#B2C7B6',
          500: '#8EAA93',
          600: '#69886F',
          700: '#4D6B53',
          800: '#344D3A',
          900: '#1F3324',
        },
        citron: {
          300: '#F0FB78',
          400: '#E5F940',
          500: '#D8F523',
          600: '#BFE00D',
        },
        darkcard: {
          DEFAULT: '#111614',
          border: '#1E2522',
          lighter: '#1A211E',
        },
        forest: {
          800: '#144337',
          900: '#0C2D25',
          950: '#071F19',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      }
    },
  },
  plugins: [],
}
