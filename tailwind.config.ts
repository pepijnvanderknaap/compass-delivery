import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          gray1: '#1D1D1F',
          gray2: '#6E6E73',
          gray3: '#86868B',
          gray4: '#D2D2D7',
          gray5: '#E8E8ED',
          gray6: '#F5F5F7',
          gray7: '#FAFAFA',
          blue: '#0071E3',
          'blue-hover': '#0077ED',
          green: '#34C759',
          red: '#FF3B30',
          orange: '#FF9500',
        },
      },
      fontSize: {
        'apple-display': ['32px', { lineHeight: '1.125', fontWeight: '600', letterSpacing: '-0.5px' }],
        'apple-title-lg': ['28px', { lineHeight: '1.15', fontWeight: '600' }],
        'apple-title': ['22px', { lineHeight: '1.2', fontWeight: '600' }],
        'apple-headline': ['17px', { lineHeight: '1.3', fontWeight: '600' }],
        'apple-body': ['17px', { lineHeight: '1.4', fontWeight: '400' }],
        'apple-callout': ['16px', { lineHeight: '1.35', fontWeight: '400' }],
        'apple-subheadline': ['15px', { lineHeight: '1.35', fontWeight: '400' }],
        'apple-footnote': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        'apple-caption': ['12px', { lineHeight: '1.35', fontWeight: '400' }],
      },
      boxShadow: {
        'apple-sm': '0 1px 2px rgba(0,0,0,0.04)',
        'apple-md': '0 4px 6px rgba(0,0,0,0.07)',
        'apple-lg': '0 10px 15px rgba(0,0,0,0.08)',
        'apple-xl': '0 20px 25px rgba(0,0,0,0.1)',
      },
      fontFamily: {
        'apple': ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
