// /** @type {import('tailwindcss').Config} */
// export default {
//   content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
//   theme: {
//     extend: {},
//   },
//   plugins: [],
// };
// // tailwind.config.js
// module.exports = {
//   theme: {
//     extend: {
//       animation: {
//         'float': 'float 6s ease-in-out infinite',
//         'wifi-signal': 'wifiSignal 2s ease-in-out infinite',
//         'gradient-shift': 'gradientShift 3s ease infinite',
//         'bounce-slow': 'bounce 3s infinite',
//         'spin-slow': 'spin 20s linear infinite',
//       },
//       keyframes: {
//         float: {
//           '0%, 100%': { transform: 'translateY(0px)' },
//           '50%': { transform: 'translateY(-20px)' },
//         },
//         wifiSignal: {
//           '0%, 100%': { transform: 'scale(1) rotate(0deg)' },
//           '25%': { transform: 'scale(1.1) rotate(5deg)' },
//           '50%': { transform: 'scale(1) rotate(0deg)' },
//           '75%': { transform: 'scale(1.05) rotate(-3deg)' },
//         },
//         gradientShift: {
//           '0%, 100%': { backgroundPosition: '0% 50%' },
//           '50%': { backgroundPosition: '100% 50%' },
//         },
//         'bounce-slow': {
//           '0%, 100%': { transform: 'scale(1)' },
//           '50%': { transform: 'scale(1.05)' },
//         },
//         'spin-slow': {
//           '0%': { transform: 'rotate(0deg)' },
//           '100%': { transform: 'rotate(360deg)' },
//         },
//       },
//     },
//   },
// }
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
