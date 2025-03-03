/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // Tambahkan mdx jika ada
    "./components/**/*.{js,ts,jsx,tsx}", // Jika ada folder components
    "./pages/**/*.{js,ts,jsx,tsx}", // Jika masih menggunakan /pages
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
