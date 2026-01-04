/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable static export for production
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  transpilePackages: ['@react-pdf/renderer'],
  experimental: {
    esmExternals: 'loose'
  }
}

export default nextConfig