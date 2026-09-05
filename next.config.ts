import type { NextConfig } from "next";

const CODESPACE_HOST = process.env.CODESPACE_NAME
  ? `${process.env.CODESPACE_NAME}-3000.app.github.dev`
  : undefined;

const allowedDevOrigins = [
  "*.app.github.dev",
  "localhost:3000",
  ...(CODESPACE_HOST ? [CODESPACE_HOST] : []),
];

const nextConfig: NextConfig = {
  // Next.js 16: permitir orígenes de Codespaces para Server Actions en dev
  allowedDevOrigins,
  experimental: {
    serverActions: {
      allowedOrigins: ["*.app.github.dev", "localhost:3000"],
    },
  },
};

export default nextConfig;
