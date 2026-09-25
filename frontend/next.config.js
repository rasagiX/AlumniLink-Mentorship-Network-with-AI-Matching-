/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Windows filesystem cache has been dropping generated server chunks
  // during hot reloads. Keep development builds in memory instead of using
  // webpack's persistent filesystem cache; production builds are unchanged.
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};
module.exports = nextConfig;
