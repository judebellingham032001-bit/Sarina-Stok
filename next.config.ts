import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Abaikan error TypeScript saat build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Abaikan error ESLint saat build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;