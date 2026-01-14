import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0a0a0a',
        'dark-surface': '#121212',
        'dark-elevated': '#1a1a1a',
        'dark-border': '#2a2a2a',

        'primary': {
          50: '#e6ffff',
          100: '#b3f5ff',
          200: '#80ecff',
          300: '#4de2ff',
          400: '#1ad9ff',
          500: '#00d9ff',
          600: '#00b8d9',
          700: '#0097b3',
          800: '#00768c',
          900: '#005566',
        },

        'alert': {
          50: '#ffe6f0',
          100: '#ffb3d1',
          200: '#ff80b3',
          300: '#ff4d94',
          400: '#ff1a75',
          500: '#ff0080',
          600: '#d9006b',
          700: '#b30056',
          800: '#8c0041',
          900: '#66002c',
        },

        'success': {
          500: '#00ff88',
          600: '#00d973',
        },

        'warning': {
          500: '#ffaa00',
          600: '#d98f00',
        },
      },
      fontFamily: {
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'spin': 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
