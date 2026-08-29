import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: process.env.R2_PUBLIC_URL
      ? [{ protocol: new URL(process.env.R2_PUBLIC_URL).protocol.replace(":", "") as "http" | "https", hostname: new URL(process.env.R2_PUBLIC_URL).hostname, pathname: `${new URL(process.env.R2_PUBLIC_URL).pathname.replace(/\/$/, "")}/**` }]
      : [],
  },
};

export default nextConfig;
