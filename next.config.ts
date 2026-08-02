import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Abaikan error TypeScript saat build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;