import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Only the exact photos the site uses (credited in docs/CREDITS.md), so
    // the image optimizer can't be used to fetch anything else from the host.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/20/cambridge.JPG", search: "" },
    ],
  },
};

export default nextConfig;
