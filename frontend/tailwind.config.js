/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'banana': {
          50: '#fff8e8',
          100: '#ffefc7',
          200: '#ffdf97',
          300: '#ffc965',
          400: '#ffb13f',
          500: '#f59216',
          600: '#d8770b',
          700: '#ad5a0e',
          800: '#8a4712',
          900: '#723d13',
        },
        'ink': {
          50: '#f3f6f8',
          100: '#d7e2e8',
          200: '#aec6d1',
          300: '#7f9eaf',
          400: '#5d8296',
          500: '#45697d',
          600: '#365669',
          700: '#2f4859',
          800: '#2c3d4a',
          900: '#293540',
        },
        'mint': {
          100: '#d9f4ea',
          300: '#73d7b1',
          500: '#1f9d75',
          700: '#0f6f53',
        },
      },
      fontFamily: {
        sans: ['Avenir Next', 'Avenir', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        display: ['Poppins', 'Avenir Next', 'PingFang SC', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'panel': '16px',
      },
      boxShadow: {
        'yellow': '0 10px 22px rgba(245, 146, 22, 0.26)',
        'lift': '0 20px 45px -20px rgba(30, 41, 59, 0.4)',
        'sm': '0 1px 2px rgba(0,0,0,0.05)',
        'md': '0 4px 6px rgba(0,0,0,0.07)',
        'lg': '0 10px 15px rgba(0,0,0,0.1)',
        'xl': '0 20px 25px rgba(0,0,0,0.15)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        '3xl': '0 35px 60px -12px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'gradient': 'gradient 3s ease infinite',
        'gradient-x': 'gradient-x 2s ease infinite',
        'fade-up': 'fade-up 0.45s ease-out both',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 0%' },
        },
      },
    },
  },
  plugins: [],
}
