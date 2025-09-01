/** @type {import('next').NextConfig} */

import bundleAnalyzer from '@next/bundle-analyzer';
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

const dev = process.env.NODE_ENV === 'development';

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.vercel-storage.com' },
      { protocol: 'https', hostname: 'commondatastorage.googleapis.com' },
      { protocol: 'https', hostname: '**.s3.amazonaws.com' },
      { protocol: 'https', hostname: '**.s3-**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' }
    ]
  },

  // Force browsers to refetch JSON manifests (dev = no-store; prod = revalidate each request).
  async headers() {
    const cacheHeader = dev ? 'no-store' : 'public, max-age=0, must-revalidate';

    return [
      // Motion manifests
      {
        source: '/Motion/.videos.json',
        headers: [{ key: 'Cache-Control', value: cacheHeader }]
      },
      {
        source: '/Motion/.top.json',
        headers: [{ key: 'Cache-Control', value: cacheHeader }]
      },

      // Stills manifests (add/remove lines to match your generator outputs)
      {
        source: '/Portfolio/.folders.json',
        headers: [{ key: 'Cache-Control', value: cacheHeader }]
      },
      {
        source: '/Portfolio/.images.json',
        headers: [{ key: 'Cache-Control', value: cacheHeader }]
      },

      // Optional version file if you use one
      {
        source: '/.version.json',
        headers: [{ key: 'Cache-Control', value: cacheHeader }]
      }
    ];
  }
};

export default withBundleAnalyzer(nextConfig);
// export default nextConfig;
