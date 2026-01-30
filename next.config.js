const path = require('path');

const SW_VERSION =
  process.env.NEXT_PUBLIC_SW_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.VERCEL_BUILD_ID ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  'local';

const isVercelProd = process.env.VERCEL_ENV === 'production';
const requestedOutputMode = process.env.NEXT_OUTPUT_MODE;
const resolvedOutputMode =
  isVercelProd && requestedOutputMode === 'export' ? undefined : requestedOutputMode;

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: resolvedOutputMode,
  async headers() {
    return [
      {
        source: '/service-worker.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
    ];
  },
  experimental: {
    outputFileTracingRoot: process.env.NEXT_OUTPUT_FILE_TRACING_ROOT
      ? path.resolve(process.env.NEXT_OUTPUT_FILE_TRACING_ROOT)
      : __dirname,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_SW_VERSION: SW_VERSION,
  },
};

module.exports = nextConfig;
