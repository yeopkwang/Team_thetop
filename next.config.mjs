/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! 경고 !!
    // 프로젝트에 타입 에러가 있어도 무시하고 프로덕션 빌드를 완료합니다.
    ignoreBuildErrors: true,
  },
  eslint: {
    // !! 경고 !!
    // 프로젝트에 ESLint 에러가 있어도 무시하고 배포합니다.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; // .mjs 파일이면 export default nextConfig;




// /** @type {import('next').NextConfig} */

// const nextConfig = {
//   experimental: {
//     serverActions: true,
//   },
//   images: {
//     remotePatterns: [
//       {
//         protocol: 'https',
//         hostname: '**',
//       },
//     ],
//   },
// };

// export default nextConfig;
