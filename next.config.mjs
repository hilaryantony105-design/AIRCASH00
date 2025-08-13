/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  basePath: '/AIRCASH00',
  assetPrefix: '/AIRCASH00/',
  images: {
    unoptimized: true,
  },
  // Suppress hydration warnings
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  experimental: {
    // Add experimental features here if needed
  },
}

export default nextConfig
