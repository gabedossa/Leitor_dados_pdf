import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // pdfkit reads its font metrics (data/Helvetica.afm) off __dirname at runtime;
  // bundling it rewrites that path and breaks the lookup, so it must stay external.
  serverExternalPackages: ['pdfkit'],
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
