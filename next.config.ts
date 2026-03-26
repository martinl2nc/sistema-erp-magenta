import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer needs to be excluded from SSR bundling
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
