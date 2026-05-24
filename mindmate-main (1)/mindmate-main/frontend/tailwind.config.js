/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0f1117',
          card: '#1a1d2e',
        },
        accent: {
          purple: '#a78bfa',
          green: '#6ee7b7',
          coral: '#fca5a5',
        },
        text: {
          primary: '#f1f5f9',
          muted: '#94a3b8',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '24px',
      },
      backdropBlur: {
        glass: '12px',
      },
    },
  },
  plugins: [],
}