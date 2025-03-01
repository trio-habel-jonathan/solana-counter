/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
      "./app/**/*.{js,ts,jsx,tsx}",
      "./src/**/*.{js,ts,jsx,tsx}", // Pastiin cover semua file
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  };