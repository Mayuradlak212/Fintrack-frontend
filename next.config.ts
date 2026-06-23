import type { NextConfig } from 'next';
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true, // disabled in dev; enable in production build
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

module.exports = withPWA(nextConfig);
