/* eslint-disable */
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ["tsx", "ts"],
  output: "standalone",
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "~": path.resolve(__dirname, "./"),
    };
    return config;
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
