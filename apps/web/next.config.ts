import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["lucide-react"],
  allowedDevOrigins: ["estuda.local"],
};

export default nextConfig;
