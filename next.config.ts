import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: false,
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 壓縮
  compress: true,
  
  // 性能優化
  experimental: {
    optimizePackageImports: ['@/components/ui'],
  },
  
  // 優化後的代碼混淆設定 (只在生產環境) - 平衡安全性與性能
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      const JavaScriptObfuscator = require('webpack-obfuscator');
      config.plugins.push(
        new JavaScriptObfuscator({
          // 基本混淆設置 - 性能影響較小
          rotateStringArray: false,
          stringArray: true,
          stringArrayThreshold: 0.5,
          stringArrayEncoding: ['none'], // 移除base64編碼，提升性能
          disableConsoleOutput: true,
          
          // 移除性能殺手選項
          debugProtection: false, // 移除：會每2秒執行檢查
          debugProtectionInterval: 0,
          selfDefending: false, // 移除：增加運行時檢查負擔
          controlFlowFlattening: false, // 移除：使代碼邏輯複雜化
          deadCodeInjection: false, // 移除：注入假代碼影響性能
          
          // 保持的安全設置
          identifierNamesGenerator: 'hexadecimal',
          renameGlobals: false,
          splitStrings: false, // 關閉字符串分割，提升性能
          transformObjectKeys: false, // 關閉對象鍵轉換，提升性能
          unicodeEscapeSequence: false,
        }, ['**/node_modules/**/*'])
      );
    }
    return config;
  },
  
  // 安全性設定
  poweredByHeader: false,
  
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
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet, notranslate, noimageindex',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer-when-downgrade',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
