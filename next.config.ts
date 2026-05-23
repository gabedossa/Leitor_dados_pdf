import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  async redirects() {
    return [
      { source: '/dashboard/projects', destination: '/projects', permanent: false },
      { source: '/dashboard/projects/:path*', destination: '/projects/:path*', permanent: false },
      { source: '/dashboard/pdfs', destination: '/pdfs', permanent: false },
      { source: '/dashboard/charts', destination: '/charts', permanent: false },
      { source: '/dashboard/charts/:path*', destination: '/charts/:path*', permanent: false },
      { source: '/dashboard/data/:path*', destination: '/data/:path*', permanent: false },
      { source: '/dashboard/settings', destination: '/settings', permanent: false },
    ]
  },
}

export default nextConfig
