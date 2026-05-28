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
        // 开源官网首页专用调色板（深蓝主色 · 仅 open-source-home 使用，不影响咨询站紫靛 token）
        os: {
          // 品牌主题：深蓝 + 紫（取自益语智库 logo 的渐变深蓝 + 品牌紫），精致克制
          navy: '#16265E',      // 深藏蓝(logo 底) — 标题/页脚/主按钮
          'navy-700': '#21357F',
          blue: '#2C6FD0',      // 天青蓝(logo 顶) — 链接/图标/交互
          indigo: '#4F46E5',    // 品牌靛(渐变桥)
          violet: '#7C3AED',    // 品牌紫 — 次强调
          canvas: '#F7F8FC',    // 冷调浅底
          paper: '#FFFFFF',
          mist: '#ECEFFB',      // 浅靛蓝(区块/卡片底)
          spark: '#7C3AED',     // 强调/加电 = 品牌紫
          'spark-soft': '#EDE7FB',
          ink: '#1A2235',       // 蓝墨近黑(正文标题)
          muted: '#5A6178',     // 蓝灰次要文字
          line: '#E3E6F1',      // 发丝线/边框(微蓝)
        },
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
        // 开源官网：轻阴影（指令要求阴影必须轻，不要厚重浮层）
        'os': '0 1px 2px rgba(22,38,94,0.05), 0 8px 24px -14px rgba(22,38,94,0.18)',
        'os-lg': '0 2px 4px rgba(22,38,94,0.05), 0 18px 44px -20px rgba(22,38,94,0.22)',
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
