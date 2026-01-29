/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Tokyo Night Storm palette
        tokyo: {
          bg: '#1a1b26',
          'bg-dark': '#16161e',
          'bg-highlight': '#292e42',
          'bg-visual': '#33467c',
          storm: '#24283b',
          terminal: '#414868',
          fg: '#c0caf5',
          'fg-dark': '#a9b1d6',
          'fg-gutter': '#3b4261',
          comment: '#565f89',
          blue: '#7aa2f7',
          cyan: '#7dcfff',
          magenta: '#bb9af7',
          purple: '#9d7cd8',
          orange: '#ff9e64',
          yellow: '#e0af68',
          green: '#9ece6a',
          teal: '#1abc9c',
          red: '#f7768e',
          pink: '#ff007c',
        },
      },
    },
  },
  plugins: [],
}