import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['files.edgestore.dev'],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
