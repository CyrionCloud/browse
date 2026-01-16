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
        // Main backgrounds - very dark like reference
        background: '#0a0e14',
        surface: '#0d1117',
        'surface-elevated': '#161b22',
        'surface-hover': '#1c2128',
        border: '#21262d',
        'border-soft': '#30363d',

        // Accent - cyan/teal as in reference
        accent: {
          DEFAULT: '#00bcd4',
          muted: '#00838f',
          hover: '#00e5ff',
          foreground: '#ffffff',
          light: 'rgba(0, 188, 212, 0.15)',
        },

        // Text colors
        text: {
          primary: '#e6edf3',
          secondary: '#8b949e',
          muted: '#484f58',
        },

        // Success - teal/green
        success: {
          DEFAULT: '#00bfa5',
          muted: '#009688',
          light: 'rgba(0, 191, 165, 0.15)',
        },

        // Warning - amber/orange
        warning: {
          DEFAULT: '#f0ad4e',
          muted: '#e09600',
          light: 'rgba(240, 173, 78, 0.15)',
        },

        // Error - red
        error: {
          DEFAULT: '#f85149',
          muted: '#da3633',
          hover: '#ff6b6b',
          foreground: '#ffffff',
          light: 'rgba(248, 81, 73, 0.15)',
        },

        // Muted colors
        muted: {
          DEFAULT: '#484f58',
          foreground: '#8b949e',
        },

        // General
        foreground: '#e6edf3',
        card: '#0d1117',
        input: '#161b22',
        ring: '#00bcd4',

        // Badge and status colors
        'active-badge': 'rgba(0, 188, 212, 0.15)',
        'checkmark': '#00bfa5',

        // Gradient
        'gradient-start': '#00bcd4',
        'gradient-end': '#7c3aed',

        // Sidebar
        sidebar: {
          DEFAULT: '#0d1117',
          hover: '#161b22',
          active: '#00bcd4',
          border: '#21262d',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'monospace'],
        sans: ['var(--font-plex-sans)', 'ui-sans-serif', 'system-ui'],
      },
      borderWidth: {
        '3': '3px',
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

