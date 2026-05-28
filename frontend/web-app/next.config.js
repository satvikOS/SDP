/** @type {import('next').NextConfig} */
// Professional UI - OLED black theme with glassmorphism
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://invalid'
  }
}

module.exports = nextConfig
