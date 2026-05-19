/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0A0E14',
          elevated: '#0F1419',
          panel: '#141B23',
          hover: '#1A2230',
        },
        border: {
          subtle: '#1F2937',
          emphasis: '#2D3748',
          strong: '#3B4757',
        },
        text: {
          primary: '#E2E8F0',
          secondary: '#94A3B8',
          muted: '#64748B',
          faint: '#475569',
        },
        accent: {
          primary: '#00D9FF',
          warning: '#FFB627',
          critical: '#FF4747',
          success: '#22D3A6',
        },
        viz: {
          cyan: '#00D9FF',
          magenta: '#FF4ECD',
          amber: '#FFB627',
          teal: '#22D3A6',
          violet: '#A78BFA',
          coral: '#FF7A6B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        micro: ['10px', { lineHeight: '14px', letterSpacing: '0.08em' }],
        label: ['11px', { lineHeight: '14px', letterSpacing: '0.06em' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '18px' }],
        base: ['13px', { lineHeight: '18px' }],
        md: ['14px', { lineHeight: '20px' }],
        lg: ['16px', { lineHeight: '22px' }],
        xl: ['18px', { lineHeight: '24px' }],
        '2xl': ['22px', { lineHeight: '28px' }],
      },
      borderRadius: {
        none: '0',
        xs: '1px',
        sm: '2px',
        DEFAULT: '3px',
        md: '4px',
      },
      spacing: {
        0.25: '1px',
        0.75: '3px',
        1.25: '5px',
        1.75: '7px',
        4.5: '18px',
      },
      boxShadow: {
        panel: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 1px 0 rgba(0,0,0,0.4)',
        tile: 'inset 0 1px 0 rgba(255,255,255,0.025)',
        glow: '0 0 0 1px rgba(0,217,255,0.35), 0 0 12px rgba(0,217,255,0.18)',
        critical: '0 0 0 1px rgba(255,71,71,0.4), 0 0 10px rgba(255,71,71,0.2)',
      },
      transitionTimingFunction: {
        crisp: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      transitionDuration: {
        100: '100ms',
        150: '150ms',
        200: '200ms',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.4, transform: 'scale(0.85)' },
        },
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        flipIn: {
          '0%': { opacity: 0, transform: 'translateY(-4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        pulseDot: 'pulseDot 1.4s ease-in-out infinite',
        scan: 'scan 2.4s linear infinite',
        flipIn: 'flipIn 200ms ease-out',
      },
    },
  },
  plugins: [],
};
