import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--color-bg) / <alpha-value>)',
        'bg-elevated': 'hsl(var(--color-bg-elevated) / <alpha-value>)',
        'bg-muted': 'hsl(var(--color-bg-muted) / <alpha-value>)',
        hover: 'hsl(var(--color-hover) / <alpha-value>)',
        input: 'hsl(var(--color-input) / <alpha-value>)',
        surface: 'hsl(var(--color-bg-muted) / <alpha-value>)',
        border: 'hsl(var(--color-border) / <alpha-value>)',
        'border-muted': 'hsl(var(--color-border) / <alpha-value>)',
        'border-strong': 'hsl(var(--color-border-strong) / <alpha-value>)',
        'border-active': 'hsl(var(--color-border-active) / <alpha-value>)',
        'border-bright': 'hsl(var(--color-border-bright) / <alpha-value>)',
        text: 'hsl(var(--color-text) / <alpha-value>)',
        'text-secondary': 'hsl(var(--color-text-secondary) / <alpha-value>)',
        'text-muted': 'hsl(var(--color-text-muted) / <alpha-value>)',
        'text-faint': 'hsl(var(--color-text-faint) / <alpha-value>)',
        accent: 'hsl(var(--color-accent) / <alpha-value>)',
        'accent-hover': 'hsl(var(--color-accent-hover) / <alpha-value>)',
        'accent-fg': 'hsl(var(--color-accent-fg) / <alpha-value>)',
        success: 'hsl(var(--color-success) / <alpha-value>)',
        warning: 'hsl(var(--color-warning) / <alpha-value>)',
        destructive: 'hsl(var(--color-destructive) / <alpha-value>)',
        'destructive-fg': 'hsl(var(--color-destructive-fg) / <alpha-value>)',
        'badge-bg': 'hsl(var(--color-badge-bg) / <alpha-value>)',
        'badge-text': 'hsl(var(--color-badge-text) / <alpha-value>)',
        'step-bg': 'hsl(var(--color-step-bg) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      screens: {
        'preview-sm': '375px',
        'preview-md': '768px',
        'preview-lg': '1440px',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { transform: 'translateY(4px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 150ms ease-out',
        spin: 'spin 0.75s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
