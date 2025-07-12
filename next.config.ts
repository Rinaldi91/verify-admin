import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "http", // atau 'http' jika perlu
        hostname: "verify-api.test", // <-- Ganti dengan domain gambar Anda (mis: s3.amazonaws.com)
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;