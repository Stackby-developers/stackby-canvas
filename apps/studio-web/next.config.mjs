/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@stackby/ui', '@stackby/schema-types'],

  async headers() {
    return [
      // Viewer shell — short browser cache, allow CDN to serve stale while revalidating
      {
        source: '/p/:slug*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=30, s-maxage=300, stale-while-revalidate=3600' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      // Studio app shell — never cache (authenticated, dynamic)
      {
        source: '/((?!p/).*)',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      // Static assets — immutable, long cache
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};
export default nextConfig;
