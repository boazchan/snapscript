import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 壓縮
  compress: true,
  
  // 代碼混淆設定 (只在生產環境)
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      const JavaScriptObfuscator = require('webpack-obfuscator');
      config.plugins.push(
        new JavaScriptObfuscator({
          rotateStringArray: true,
          stringArray: true,
          stringArrayThreshold: 0.8,
          stringArrayEncoding: ['base64'],
          disableConsoleOutput: true,
          debugProtection: true,
          debugProtectionInterval: 2000,
          selfDefending: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.8,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.4,
          identifierNamesGenerator: 'hexadecimal',
          renameGlobals: false,
          splitStrings: true,
          splitStringsChunkLength: 10,
          transformObjectKeys: true,
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
