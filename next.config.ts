import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 圖片優化
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 壓縮
  compress: true,
  
  // 實驗性功能
  experimental: {
    optimizeCss: true,
  },
  
  // Headers 設定
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
