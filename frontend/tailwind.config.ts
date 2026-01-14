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
        'background': '#1a1a1a',
        'surface': '#242424',
        'surface-elevated': '#2d2d2d',
        'surface-hover': '#363636',
        'border': '#3d3d3d',
        'border-soft': '#4a4a4a',

        'accent': {
          DEFAULT: '#6366f1',
          muted: '#818cf8',
          hover: '#4f46e5',
          foreground: '#ffffff',
        },

        'error': {
          DEFAULT: '#dc2626',
          muted: '#ef4444',
          hover: '#b91c1c',
          foreground: '#ffffff',
        },

        'muted': {
          DEFAULT: '#a1a1aa',
          foreground: '#71717a',
        },

        'foreground': '#f4f4f5',
        'card': '#242424',
        'input': '#2d2d2d',
        'ring': '#6366f1',
      },
      fontFamily: {
        mono: ['ui-monospace', 'monospace'],
        sans: ['var(--font-plex-sans)', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-out-left': 'slideOutLeft 0.3s ease-out',
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
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutLeft: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
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
