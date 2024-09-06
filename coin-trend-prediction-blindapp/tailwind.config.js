const { nextui } = require('@nextui-org/react');

// tailwind.config.js
module.exports = {
    content: [
        './src/**/*.{js,jsx,ts,tsx}',
        "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [require('@tailwindcss/forms')],
    darkMode: "class",
    plugins: [nextui()],
};
