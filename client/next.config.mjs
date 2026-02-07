/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Ensure consistent build ID for deployment stability
  generateBuildId: async () => {
    if (process.env.BUILD_ID) return process.env.BUILD_ID;
    if (process.env.GIT_COMMIT_SHA) return process.env.GIT_COMMIT_SHA;
    return null;
  },
};

export default nextConfig;
