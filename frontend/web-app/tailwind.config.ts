import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // OLED Black theme
        dark: {
          bg: '#000000',
          surface: '#0a0a0a',
          panel: '#111111',
          border: '#1a1a1a',
          hover: '#151515',
          text: {
            primary: '#e8e8e8',
            secondary: '#a0a0a0',
            tertiary: '#6b6b6b',
          }
        },
        // Light theme (dull white/grey)
        light: {
          bg: '#f7f7f7',
          surface: '#fafafa',
          panel: '#ffffff',
          border: '#e5e5e5',
          hover: '#f0f0f0',
          text: {
            primary: '#171717',
            secondary: '#525252',
            tertiary: '#737373',
          }
        },
        // Accent colors
        accent: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9ddfe',
          300: '#7cc4fd',
          400: '#36a8fa',
          500: '#0c8ce9',
          600: '#006ec7',
          700: '#0158a1',
          800: '#064b85',
          900: '#0b3f6e',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        sm: ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        base: ['1rem', { lineHeight: '1.6', letterSpacing: '0.005em' }],
        lg: ['1.125rem', { lineHeight: '1.6', letterSpacing: '0.005em' }],
        xl: ['1.25rem', { lineHeight: '1.5', letterSpacing: '0' }],
        '2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.015em' }],
        '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
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
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
export default config
