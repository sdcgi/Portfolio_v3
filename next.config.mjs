
/** @type {import('next').NextConfig} */

import bundleAnalyzer from '@next/bundle-analyzer';
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.vercel-storage.com' },
      { protocol: 'https', hostname: 'commondatastorage.googleapis.com' },
      { protocol: 'https', hostname: '**.s3.amazonaws.com' },
      { protocol: 'https', hostname: '**.s3-**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' }
    ]
  }
};

export default withBundleAnalyzer(nextConfig);
//export default nextConfig;
