/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gp-burgundy': '#4a0e1c',
        'gp-ivory': '#f4ebd8',
        'gp-gold': '#d4af37',
        'gp-gold-light': '#ebd173',
        'gp-sepia': '#704214',
        'gp-dark': '#1a1a1a',
      },
      fontFamily: {
        'garamond': ['"Cormorant Garamond"', 'serif'],
        'nastaliq': ['"Noto Nastaliq Urdu"', 'serif'],
      },
      backgroundImage: {
        'noise': "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')",
      }
    },
  },
  plugins: [],
}
