import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontSize: {
                'fluid-base': ['clamp(1rem, calc(0.875rem + 0.625vw), 1.25rem)', { lineHeight: '1.6' }],
            },
            colors: {
                background: "#F8F9FA",
                typography: "#4A4A59",
                "dopamine-yellow": "#FFD757",
                "dopamine-cyan": "#00BAF0",
                "gentle-green": "#A3F0AF",
            },
            backdropBlur: {
                'glass': '20px',
            }
        },
    },
    plugins: [],
};
export default config;
