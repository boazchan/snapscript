import crypto from 'crypto';

// 環境檢查
export function validateEnvironment(): boolean {
  const requiredEnvVars = ['GEMINI_API_KEY'];
  return requiredEnvVars.every(envVar => process.env[envVar]);
}

// 生成安全令牌
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 檢查請求來源
export function validateOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
  ].filter(Boolean);
  
  return allowedOrigins.includes(origin);
}

// 檢查 User-Agent 是否為瀏覽器
export function validateUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  
  const browserPatterns = [
    /Mozilla/,
    /Chrome/,
    /Safari/,
    /Firefox/,
    /Edge/,
  ];
  
  return browserPatterns.some(pattern => pattern.test(userAgent));
}

// 加密敏感數據
export function encryptData(data: string, key: string = process.env.ENCRYPTION_KEY || 'default-key'): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// 解密敏感數據
export function decryptData(encryptedData: string, key: string = process.env.ENCRYPTION_KEY || 'default-key'): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// 檢查請求頻率（進階版）
export class AdvancedRateLimit {
  private static requests = new Map<string, { count: number; resetTime: number; blocked: boolean }>();
  private static suspiciousIPs = new Set<string>();
  
  static checkLimit(
    identifier: string, 
    maxRequests: number = 10, 
    windowMs: number = 60000,
    blockDuration: number = 300000 // 5分鐘封鎖
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.requests.get(identifier);
    
    // 檢查是否被封鎖
    if (record?.blocked && now < record.resetTime) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }
    
    // 重置或創建新記錄
    if (!record || now > record.resetTime) {
      this.requests.set(identifier, { 
        count: 1, 
        resetTime: now + windowMs, 
        blocked: false 
      });
      return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
    }
    
    // 檢查是否超過限制
    if (record.count >= maxRequests) {
      // 標記為可疑IP並封鎖
      this.suspiciousIPs.add(identifier);
      record.blocked = true;
      record.resetTime = now + blockDuration;
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }
    
    record.count++;
    return { 
      allowed: true, 
      remaining: maxRequests - record.count, 
      resetTime: record.resetTime 
    };
  }
  
  static isSuspicious(identifier: string): boolean {
    return this.suspiciousIPs.has(identifier);
  }
}

// 檢測自動化請求
export function detectAutomation(headers: Headers): boolean {
  const userAgent = headers.get('user-agent') || '';
  const accept = headers.get('accept') || '';
  const acceptLanguage = headers.get('accept-language') || '';
  const acceptEncoding = headers.get('accept-encoding') || '';
  
  // 檢測常見的自動化工具
  const automationPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /postman/i,
    /insomnia/i,
    /httpie/i,
    /bot/i,
    /crawler/i,
    /spider/i,
  ];
  
  if (automationPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }
  
  // 檢測異常的 header 組合
  if (!accept.includes('text/html') || !acceptLanguage || !acceptEncoding) {
    return true;
  }
  
  return false;
}

// 混淆錯誤訊息
export function obfuscateError(error: any, isDevelopment: boolean = process.env.NODE_ENV === 'development'): string {
  if (isDevelopment) {
    return error?.message || '開發環境錯誤';
  }
  
  // 生產環境返回通用錯誤訊息
  const genericMessages = [
    '服務暫時無法使用',
    '請求處理失敗',
    '系統繁忙，請稍後再試',
    '暫時無法處理您的請求',
  ];
  
  return genericMessages[Math.floor(Math.random() * genericMessages.length)];
} 