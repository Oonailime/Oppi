import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["lucide-react"],
  allowedDevOrigins: ["oppi.local"],
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
