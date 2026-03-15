/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Ensure Next.js is configured for SPA functionality where possible
    output: "export",
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
