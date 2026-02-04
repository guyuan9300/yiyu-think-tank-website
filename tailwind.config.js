/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF9',
        foreground: '#1C1917',
        primary: '#4F46E5',
        'primary-foreground': '#FFFFFF',
        secondary: '#7C3AED',
        'secondary-foreground': '#FFFFFF',
        accent: '#A855F7',
        'accent-foreground': '#FFFFFF',
        muted: '#F5F5F4',
        'muted-foreground': '#78716C',
        border: '#E7E5E4',
        success: '#10B981',
        card: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in-down': 'fadeInDown 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-left': 'slideInLeft 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-right': 'slideInRight 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        'blur-in': 'blurIn 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-24px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(16px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-40px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(40px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        blurIn: {
          '0%': { opacity: '0', filter: 'blur(20px)' },
          '100%': { opacity: '1', filter: 'blur(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      boxShadow: {
        'soft': '0 2px 24px -8px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 32px -8px rgba(0, 0, 0, 0.12)',
        'strong': '0 8px 48px -12px rgba(0, 0, 0, 0.16)',
        'glow-primary': '0 0 40px -8px rgba(79, 70, 229, 0.25)',
        'glow-secondary': '0 0 40px -8px rgba(124, 58, 237, 0.25)',
        'glow-accent': '0 0 40px -8px rgba(168, 85, 247, 0.25)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
    },
  },
  plugins: [],
}
