/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        growX: { '0%': { transform: 'scaleX(0)' }, '100%': { transform: 'scaleX(1)' } },
      },
      animation: {
        'fade-up': 'fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fadeIn 0.3s ease-out both',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'grow-x': 'growX 0.8s cubic-bezier(0.22,1,0.36,1) both',
      },
      colors: {
        brand: { 50: '#eef6ff', 100: '#d9eaff', 500: '#2563eb', 600: '#1d4ed8', 700: '#1e40af' },
      },
    },
  },
  plugins: [],
};
