/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#0a0f1a',
        surface: '#111827',
        border:  '#1f2937',
        teal: {
          DEFAULT: '#2dd4bf',
          dark:    '#134e4a',
          light:   '#5eead4',
        },
        amber: '#f59e0b',
        muted: '#9ca3af',
      },
      fontFamily: {
        condensed: ["'Barlow Condensed'", 'sans-serif'],
        mono:      ["'IBM Plex Mono'", 'monospace'],
      },
    },
  },
  plugins: [],
}
