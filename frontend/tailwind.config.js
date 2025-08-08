/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 1.5s infinite',
        'fadeIn': 'fadeIn 0.5s ease-in-out',
        'fadeIn-slow': 'fadeIn 0.8s ease-in-out',
        'glow': 'glow 2s ease-in-out infinite alternate'
      },
      keyframes: {
        pulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255, 99, 71, 0.3)' },
          '50%': { boxShadow: '0 0 12px rgba(255, 99, 71, 0.6)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.3)' },
          '100%': { boxShadow: '0 0 15px rgba(99, 102, 241, 0.6)' },
        }
      },
      colors: {
        tomato: {
          50: '#fff5f3',
          100: '#ffebe6',
          200: '#ffd6cc',
          300: '#ffb3a6',
          400: '#ff8a73',
          500: '#ff6347', // Primary
          600: '#ff4726',
          700: '#d62c0d',
          800: '#ab250f',
          900: '#8c2313',
          950: '#4c0f05',
        },
      },
    },
  },
  plugins: [],
}
