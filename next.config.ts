import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cover / poster / art hosts, optimized and resized by next/image.
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "media.rawg.io" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
