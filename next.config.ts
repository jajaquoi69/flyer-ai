import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  // Prevent onnxruntime-node (server-only) from being bundled client-side
  serverExternalPackages: ["onnxruntime-node", "sharp"],
};

export default nextConfig;
