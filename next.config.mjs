/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Avoids missing client-reference-manifest when building on Vercel
    serverMinification: false,
  },
};

export default nextConfig;
