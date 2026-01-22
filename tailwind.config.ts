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
        // Section-specific colors
        dk: {
          amber: '#f59e0b',
          'amber-hover': '#d97706',
        },
        lm: {
          teal: '#0d9488',
          'teal-hover': '#0f766e',
        },
        rm: {
          purple: '#7c3aed',
          'purple-hover': '#6d28d9',
        },
      },
      fontSize: {
        // Large display text - medium weight for impact
        'apple-display': ['32px', { lineHeight: '1.125', fontWeight: '500', letterSpacing: '-0.5px' }],
        // Page titles - medium weight
        'apple-title-lg': ['28px', { lineHeight: '1.15', fontWeight: '500' }],
        // Section titles - regular weight
        'apple-title': ['22px', { lineHeight: '1.2', fontWeight: '400', letterSpacing: '-0.3px' }],
        // Subsection headers - regular weight
        'apple-headline': ['17px', { lineHeight: '1.3', fontWeight: '400', letterSpacing: '-0.2px' }],
        // Body text - light weight (main text style)
        'apple-body': ['17px', { lineHeight: '1.4', fontWeight: '300', letterSpacing: '-0.1px' }],
        // Callout text - light weight
        'apple-callout': ['16px', { lineHeight: '1.35', fontWeight: '300' }],
        // Subheadline - light weight
        'apple-subheadline': ['15px', { lineHeight: '1.35', fontWeight: '300' }],
        // Footnote - light weight
        'apple-footnote': ['13px', { lineHeight: '1.4', fontWeight: '300' }],
        // Caption - light weight
        'apple-caption': ['12px', { lineHeight: '1.35', fontWeight: '300' }],
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
