/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Colores personalizados para el streaming service
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        streaming: {
          dark: '#0f172a',
          card: '#1e293b',
          accent: '#f59e0b',
        }
      },
      // Breakpoints responsivos
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      // Espaciado para componentes
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    },
  },
  plugins: [
    // Plugin para formularios
    require('@tailwindcss/forms'),
    // Plugin para aspectos de ratio
    require('@tailwindcss/aspect-ratio'),
  ],
}