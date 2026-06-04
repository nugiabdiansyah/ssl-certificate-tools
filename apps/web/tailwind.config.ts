import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: '#111126',
        border: '#1e1e3a',
        primary: '#6366f1',
        'primary-light': '#818cf8',
        muted: '#475569',
        subtle: '#64748b',
      },
    },
  },
  plugins: [],
}

export default config
