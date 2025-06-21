// 簡單的使用量追蹤
export function trackUsage(action: string, data?: any) {
  if (typeof window !== 'undefined') {
    // 可以整合 Google Analytics 或其他分析工具
    console.log('Usage:', action, data);
  }
} 