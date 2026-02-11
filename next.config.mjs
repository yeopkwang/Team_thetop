/** @type {import('"'"'next'"'"').NextConfig} */
const nextConfig = {
  // 서버 런타임을 강제하여 static export를 막음
  output: "standalone",
  typescript: {
    // 타입 에러가 있어도 프로덕션 빌드를 진행
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint 에러가 있어도 빌드 진행
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;