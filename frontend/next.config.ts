import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: false,  // Disable to prevent double API calls in dev
  experimental: {
    // @ts-ignore - allowedDevOrigins exists in newer Next.js
    allowedDevOrigins: ["8aca0529ae57.ngrok-free.app"],
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      // Proxy WHEP/WebRTC to go2rtc
      {
        source: '/api/whep',
        destination: 'http://127.0.0.1:1984/api/whep',
      },
      {
        source: '/api/webrtc',
        destination: 'http://127.0.0.1:1984/api/webrtc',
      },
      {
        source: '/api/ws',
        destination: 'http://127.0.0.1:1984/api/ws',
      },
      {
        source: '/socket.io/:path*',
        destination: process.env.NEXT_PUBLIC_BACKEND_URL
          ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/socket.io/:path*`
          : 'http://127.0.0.1:8000/socket.io/:path*',
      },
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_BACKEND_URL
          ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/:path*`
          : 'http://127.0.0.1:8000/api/:path*',
      },
    ]
  },
};

export default nextConfig;

