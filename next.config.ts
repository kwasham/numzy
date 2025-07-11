import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:8000/api/:path*' // Local development
            : '/api/:path*', // Production (Vercel will handle this)
      },
    ];
  },
};

export default nextConfig;
