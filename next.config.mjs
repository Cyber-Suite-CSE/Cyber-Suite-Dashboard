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
  // output: 'export',
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
  env: {
    // Moved here due to .env parsing issues truncating the hash
    ADMIN_EMAIL: "admin@cybersec.cse",
    ADMIN_PASSWORD_HASH: "$2b$12$yVn9KY41FQCx5k/issmlGeCooPbko/u5DGMrPYhQlcd2UlEMqvIVO",
    JWT_SECRET: "ensure-this-is-a-strong-secret-in-production",
  }
}

export default nextConfig