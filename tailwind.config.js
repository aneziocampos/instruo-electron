/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{tsx,ts,html}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0d1117',
          soft: '#161b25',
          elevated: '#1c2333'
        },
        accent: {
          DEFAULT: '#22c55e',
          hover: '#16a34a'
        },
        danger: {
          DEFAULT: '#ef4444'
        },
        warning: {
          DEFAULT: '#eab308'
        },
        text: {
          primary: '#e6edf3',
          secondary: '#8b949e',
          tertiary: '#484f58'
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.06)',
          focus: '#22c55e'
        }
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif']
      }
    }
  },
  plugins: []
}
