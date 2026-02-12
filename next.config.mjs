/** @type {import('next').NextConfig} */
const nextConfig = {

  // Enable static export for production
  output: 'standalone',
  // distDir: 'out',
  trailingSlash: true,
  // Enable file watching for Docker development
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
  async rewrites() {
    return [
      // Proxy all /api requests to the API Gateway
      {
        source: '/api/:path*',
        destination: `${process.env.API_GATEWAY_URL}/api/:path*`,
      },
    ]
  },
}

export default nextConfig