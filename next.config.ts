import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cover / poster / art hosts, optimized and resized by next/image.
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "media.rawg.io" },
    ],
  },
};

export default nextConfig;
