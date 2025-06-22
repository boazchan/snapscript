# 🔒 SnapScript 安全部署指南

## 🛡️ 安全功能概述

此項目已經實施了多層安全保護措施，包括：

### 📊 **已實施的保護措施**

1. **🔀 代碼混淆**
   - 生產環境自動混淆 JavaScript 代碼
   - 字符串加密和控制流平坦化
   - 變量名稱混淆和死代碼注入

2. **🌐 API 安全**
   - 請求來源驗證 (CORS)
   - User-Agent 檢查
   - 自動化請求檢測
   - 進階頻率限制和 IP 封鎖
   - 環境變量驗證

3. **🖥️ 前端保護**
   - 開發者工具檢測 (僅生產環境)
   - 右鍵菜單禁用
   - 常見開發者快捷鍵禁用
   - 控制台使用檢測
   - 文字選取和拖拽防護

4. **🔐 數據保護**
   - 敏感數據加密
   - 錯誤訊息混淆
   - 安全 HTTP 標頭

## 🚀 安全部署步驟

### 1. **環境變量配置**

```bash
# 複製環境變量範例
cp .env.example .env.local

# 編輯環境變量 (重要！)
nano .env.local
```

必要配置：
```env
GEMINI_API_KEY=your_actual_gemini_api_key
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
ENCRYPTION_KEY=your_32_character_secure_key_here
NODE_ENV=production
```

### 2. **安全建構**

```bash
# 執行安全建構 (推薦)
npm run build:secure

# 或使用標準建構
npm run build
```

### 3. **部署前檢查**

```bash
# 安全檢查
npm run security-check

# 檢查環境變量
node -e "console.log('✅ 環境變量已設置:', !!process.env.GEMINI_API_KEY)"
```

## ⚙️ 安全設定詳細說明

### 🔧 **Next.js 配置 (next.config.ts)**

- **代碼混淆**: 只在生產環境啟用
- **安全標頭**: 防止 XSS、點擊劫持等攻擊
- **搜尋引擎**: API 路由禁止索引

### 🛠️ **API 安全層級**

1. **Level 1**: 環境變量檢查
2. **Level 2**: 請求來源驗證
3. **Level 3**: User-Agent 驗證
4. **Level 4**: 自動化檢測
5. **Level 5**: 進階頻率限制

### 🎯 **前端保護 (僅生產環境)**

- 開發者工具檢測會顯示警告頁面
- 禁用常見的調試快捷鍵
- 防止右鍵檢視原始碼

## 🚨 部署注意事項

### ✅ **必做項目**

1. **更換所有預設密鑰**
   ```bash
   # 生成安全的加密密鑰
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **設置正確的域名**
   ```env
   NEXT_PUBLIC_SITE_URL=https://your-actual-domain.com
   ```

3. **檢查 Gemini API 配額和限制**

4. **監控 API 使用量**

### ⚠️ **安全警告**

- 🚫 **絕對不要**在代碼中硬編碼 API 密鑰
- 🚫 **絕對不要**將 `.env.local` 提交到 Git
- 🚫 **絕對不要**在前端暴露後端 API 密鑰
- ✅ **務必**定期更新依賴項目
- ✅ **務必**監控異常請求

## 🔍 監控和維護

### 📈 **建議監控項目**

1. **API 使用量統計**
2. **異常請求頻率**
3. **錯誤率監控**
4. **響應時間追蹤**

### 🛠️ **維護檢查清單**

- [ ] 每週檢查 npm audit
- [ ] 每月更新依賴項目
- [ ] 每季度檢視安全日誌
- [ ] 定期輪換 API 密鑰

## 💡 進階安全建議

### 🌐 **CDN 和 WAF**

考慮使用：
- Cloudflare (免費 WAF)
- AWS CloudFront + WAF
- Vercel Edge Functions

### 📊 **日誌和分析**

- 設置錯誤追蹤 (Sentry)
- API 使用量監控
- 異常行為警報

### 🔄 **備份策略**

- 定期備份環境變量
- 代碼版本控制
- 資料庫備份 (如適用)

## 🆘 安全事件響應

如果懷疑安全漏洞：

1. **立即更換所有 API 密鑰**
2. **檢查 API 使用日誌**
3. **更新到最新版本**
4. **加強監控頻率**

---

**⚡ 記住：安全是一個持續的過程，不是一次性的設置！** 