// app/api/generate/route.ts

import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Access your API key as an environment variable (or directly if you must).
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Security: Input validation constants
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const MAX_TEXT_LENGTH = 200;
const MAX_CUSTOM_POINT_LENGTH = 500;

// Security: Simple rate limiting (in-memory, for basic protection)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function getRateLimitKey(req: Request): string {
  // Use IP address for rate limiting (fallback to user-agent if no IP)
  return req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         req.headers.get('user-agent') || 
         'anonymous';
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(key);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  record.count++;
  return true;
}

// Security: Safe logging function
function safeLog(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(message, data);
  }
}

// Security: Safe error logging
function safeError(message: string, error?: any) {
  if (process.env.NODE_ENV === 'development') {
    console.error(message, error);
  } else {
    // In production, only log generic error info
    console.error(message, error?.message || 'Unknown error');
  }
}

export async function POST(req: Request) {
  try {
    // Security: Rate limiting check
    const rateLimitKey = getRateLimitKey(req);
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json({ 
        text: "請求過於頻繁，請稍後再試" 
      }, { status: 429 });
    }

    const { item, tone, image, customPoint, platforms, analyzeOnly, getSuggestionsOnly }: {
      item?: string;
      tone?: "搞笑" | "專業" | "簡潔";
      image?: string;
      customPoint?: string;
      platforms?: string[];
      analyzeOnly?: boolean;
      getSuggestionsOnly?: boolean;
    } = await req.json()

    // Security: Input validation
    if (item && item.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ 
        text: "商品名稱過長，請限制在200字以內" 
      }, { status: 400 });
    }

    if (customPoint && customPoint.length > MAX_CUSTOM_POINT_LENGTH) {
      return NextResponse.json({ 
        text: "自訂賣點過長，請限制在500字以內" 
      }, { status: 400 });
    }

    // Security: Image validation
    if (image) {
      // Check if it's a valid base64 image
      if (!image.startsWith('data:image/')) {
        return NextResponse.json({ 
          text: "無效的圖片格式" 
        }, { status: 400 });
      }

      // Estimate base64 size (base64 is ~33% larger than original)
      const estimatedSize = (image.length * 3) / 4;
      if (estimatedSize > MAX_IMAGE_SIZE) {
        return NextResponse.json({ 
          text: "圖片檔案過大，請選擇小於10MB的圖片" 
        }, { status: 400 });
      }

      // Check for supported image formats
      const supportedFormats = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp'];
      if (!supportedFormats.some(format => image.startsWith(format))) {
        return NextResponse.json({ 
          text: "不支援的圖片格式，請使用 JPG、PNG 或 WebP 格式" 
        }, { status: 400 });
      }
    }

    // Security: Sanitize text inputs
    const sanitizedItem = item?.trim().substring(0, MAX_TEXT_LENGTH);
    const sanitizedCustomPoint = customPoint?.trim().substring(0, MAX_CUSTOM_POINT_LENGTH);

    let identifiedProductName: string = sanitizedItem || ""
    let identifiedSellingPoints: string[] = []
    let platformResults: {[key: string]: string} = {}

    // --- Step 1: Identify Product Name and Selling Points from Image (if image is provided) ---
    if (image) {
      const base64ToGenerativePart = (base64String: string) => {
        try {
          const [, data] = base64String.split(',');
          if (!data) {
            throw new Error('Invalid base64 format');
          }
          return {
            inlineData: {
              data: data,
              mimeType: "image/jpeg",
            },
          };
        } catch (error) {
          safeError("Failed to process base64 image:", error);
          throw new Error('圖片格式處理失敗');
        }
      };

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const visionPrompt = `你是一位商品圖像理解專家，擅長從圖片中精準推論出商品的明確名稱與其賣點。

請依據圖片內容，輸出以下資訊（以 JSON 格式）：
- "item"：請具體寫出商品名稱，需包含「品項類型」（例如：跑鞋、耳機、手鍊）與可辨識的品牌（如：adidas、Nike、Apple），若無明顯品牌，請根據顏色、LOGO、外型推論最合理品牌，不可省略。
  - 限定中文字數：4～8 字
  - 禁用詞彙：「可能」、「應該」、「似乎」、「猜測」、「假設」、「看起來像」等模糊語氣
  - 命名需具體，例如：「Nike 登山跑鞋」、「Apple 鋁合金手錶」

- "selling_points"：列出該商品 3～5 個具吸引力的賣點，每點限 2～6 字，簡潔有力。

範例輸出格式如下：
{
  "item": "adidas adizero 跑鞋",
  "selling_points": ["輕量透氣", "專業競速", "高彈緩震"]
}

❌ 不良範例：
- item: "鞋子"、"某品牌跑鞋"、"可能是 Nike 的鞋子"
✅ 好範例：
- item: "Nike Air Zoom 跑鞋"、"Apple Watch 鋁合金款"

請以繁體中文回答，並只輸出 JSON 格式，不要補充說明。`

      try {
        const result = await model.generateContent([
          visionPrompt,
          base64ToGenerativePart(image)
        ]);
        const response = await result.response;
        let textContent = response.text();

        // Security: Safe logging (only in development)
        safeLog("Gemini Vision Response received");

        // Use regex to extract JSON content from markdown code block if present
        const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          textContent = jsonMatch[1];
        }

        // Security: Validate JSON before parsing
        if (!textContent || textContent.length > 10000) {
          throw new Error('Invalid response format');
        }

        // Try to parse the JSON output from Gemini
        const parsedVisionContent = JSON.parse(textContent);
        identifiedProductName = parsedVisionContent.item?.trim().substring(0, MAX_TEXT_LENGTH) || "";
        identifiedSellingPoints = Array.isArray(parsedVisionContent.selling_points) ? 
          parsedVisionContent.selling_points
            .map((sp: string) => sp.trim().substring(0, 50))
            .filter((sp: string) => sp.length > 0)
            .slice(0, 10) : []; // Limit to max 10 selling points
        
        // Always add "限時優惠" as a fixed option for image analysis results
        identifiedSellingPoints.push("限時優惠");

      } catch (e) {
        safeError("Failed to get or parse vision API response from Gemini:", e);
        return NextResponse.json({ 
          text: "圖片分析服務暫時無法使用，請稍後再試或手動輸入商品資訊" 
        }, { status: 500 });
      }

      if (!identifiedProductName) {
        return NextResponse.json({ 
          text: "無法辨識圖片中的產品，請提供更清晰的商品圖片或手動輸入商品名稱" 
        }, { status: 400 })
      }

      // If analyzeOnly is true, return only the analysis results
      if (analyzeOnly) {
        return NextResponse.json({ 
          product_name: identifiedProductName, 
          selling_points: identifiedSellingPoints 
        })
      }
    }

    // --- Step 1.5: Generate Selling Point Suggestions for Text Input (if getSuggestionsOnly is true) ---
    if (getSuggestionsOnly && sanitizedItem && !image) {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const suggestionPrompt = `你是一位商品行銷專家，擅長根據商品名稱推論其核心賣點。

請根據商品名稱「${sanitizedItem}」，分析並提供 3～5 個具吸引力的賣點建議。

要求：
- 每個賣點限制 2～6 字，簡潔有力
- 針對該商品類型的常見優勢特色
- 符合消費者關注的購買決策因素
- 具備行銷吸引力，能促進購買慾望

請以 JSON 格式輸出：
{
  "selling_points": ["賣點1", "賣點2", "賣點3", "賣點4", "賣點5"]
}

請以繁體中文回答，並只輸出 JSON 格式，不要補充說明。`;

      try {
        const result = await model.generateContent([suggestionPrompt]);
        const response = await result.response;
        let textContent = response.text();

        safeLog("Gemini Suggestion Response received");

        // Use regex to extract JSON content from markdown code block if present
        const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          textContent = jsonMatch[1];
        }

        // Security: Validate response
        if (!textContent || textContent.length > 5000) {
          throw new Error('Invalid suggestion response');
        }

        // Try to parse the JSON output from Gemini
        const parsedSuggestionContent = JSON.parse(textContent);
        identifiedSellingPoints = Array.isArray(parsedSuggestionContent.selling_points) ? 
          parsedSuggestionContent.selling_points
            .map((sp: string) => sp.trim().substring(0, 50))
            .filter((sp: string) => sp.length > 0)
            .slice(0, 10) : [];

        // Always add "限時優惠" as a fixed option
        identifiedSellingPoints.push("限時優惠");

        return NextResponse.json({ 
          selling_points: identifiedSellingPoints 
        });

      } catch (e) {
        safeError("Failed to get or parse suggestion API response from Gemini:", e);
        return NextResponse.json({ 
          selling_points: ["限時優惠"] 
        });
      }
    }

    // --- Step 2: Generate Copy (requires identifiedProductName) ---
    if (!identifiedProductName) {
      return NextResponse.json({ 
        text: "請輸入商品名稱或上傳圖片以生成文案" 
      }, { status: 400 })
    }

    // Combine identified selling points with custom point if provided
    let allSellingPoints = [...identifiedSellingPoints];
    if (sanitizedCustomPoint && sanitizedCustomPoint.trim()) {
      // Split customPoint by '、' and filter out empty strings
      const customPoints = sanitizedCustomPoint.split('、')
        .map(point => point.trim().substring(0, 50))
        .filter(point => point.length > 0)
        .slice(0, 20); // Limit custom points
      allSellingPoints.push(...customPoints);
    }
    
    // Remove "限時優惠" from identifiedSellingPoints since it's only for suggestion, not auto-inclusion
    // But keep it if it was explicitly selected by user in customPoint
    allSellingPoints = allSellingPoints.filter(point => {
      if (point === "限時優惠") {
        // Keep "限時優惠" only if it was explicitly selected by user
        return sanitizedCustomPoint && sanitizedCustomPoint.includes("限時優惠");
      }
      return true;
    });

    // Security: Limit total selling points
    allSellingPoints = allSellingPoints.slice(0, 15);

    // Get tone mapping
    const toneMapping = {
      "簡潔": "簡潔",
      "專業": "專業", 
      "輕鬆": "輕鬆"
    };
    
    const selectedTone = toneMapping[tone as keyof typeof toneMapping] || "專業";

    // Platform-specific prompts with professional copywriting approach
    const platformPrompts = {
      instagram: `你是一位專業品牌文案撰寫師，擅長靈活運用三種語氣風格（簡潔、專業、輕鬆），並依據不同平台（Instagram、Facebook、電商網站）調整文案結構、字數與表達，產出貼近人類語感、自然流暢且具轉換力的行銷文案。

---

【語氣風格定義與句型範例】：

1. 簡潔  
- 重點明確，句子短促，動詞強烈。  
- 範例句：  
  「立即＋動作」  
  「功能＋一次搞定」  
  「產品＋幫你省下＋結果」

2. 專業  
- 語句正式，注重細節與可信度。  
- 範例句：  
  「專為＋對象＋設計」  
  「採用＋技術／材質＋確保＋結果」  
  「有效解決＋痛點，提升＋效益」

3. 輕鬆  
- 親切自然，口語化，帶情感與幽默。  
- 範例句：  
  「也太＋形容詞＋了吧！」  
  「不用想，直接＋動作」  
  「一用就回不去了」

---

【平台文案結構與字數】：

- Instagram（80–150字）  
  三段式：吸睛開頭 → 產品特色 → 行動呼籲（CTA）  
  語氣輕快，emoji 自然點綴，重視情境共鳴。

- Facebook（150–250字）  
  敘事式：問題引發共鳴 → 產品賣點 → CTA  
  敘事感強，流暢自然，適合帶入使用者故事。

- 電商網站（100–200字）  
  標題句 + 條列式特色（3–5點）+ 使用場景（選填）+ CTA  
  用詞正式，說服力強，emoji 輔助不過度。

---

【促銷字句使用規範】

- 只有當「商品特色」欄位明確包含「限時優惠」、「促銷」、「折扣」或類似促銷字眼時，文案才可自然融入相關促銷內容。  
- 若「商品特色」中沒有提及促銷資訊，請勿自行加入任何限時優惠、折扣或促銷相關字句。  
- 促銷訊息要與語氣風格和平台調性相符。

---

【輸入格式】

- 平台：Instagram
- 語氣風格：${selectedTone}
- 商品類型：${identifiedProductName}
- 商品特色：${allSellingPoints.join('、')}

---

【輸出要求】

- 嚴格遵守平台字數限制。  
- 分三段輸出（Instagram）、或符合各平台結構，**僅輸出純文案內容，不要輸出段落標題或標註。**  
- 文案自然流暢，避免機器人語氣。  
- 包含明確且吸引人的行動呼籲（CTA）。

---

請根據以上要求，產出符合輸入條件的行銷文案。`,

      facebook: `你是一位專業品牌文案撰寫師，擅長靈活運用三種語氣風格（簡潔、專業、輕鬆），並依據不同平台（Instagram、Facebook、電商網站）調整文案結構、字數與表達，產出貼近人類語感、自然流暢且具轉換力的行銷文案。

---

【語氣風格定義與句型範例】：

1. 簡潔  
- 重點明確，句子短促，動詞強烈。  
- 範例句：  
  「立即＋動作」  
  「功能＋一次搞定」  
  「產品＋幫你省下＋結果」

2. 專業  
- 語句正式，注重細節與可信度。  
- 範例句：  
  「專為＋對象＋設計」  
  「採用＋技術／材質＋確保＋結果」  
  「有效解決＋痛點，提升＋效益」

3. 輕鬆  
- 親切自然，口語化，帶情感與幽默。  
- 範例句：  
  「也太＋形容詞＋了吧！」  
  「不用想，直接＋動作」  
  「一用就回不去了」

---

【平台文案結構與字數】：

- Instagram（80–150字）  
  三段式：吸睛開頭 → 產品特色 → 行動呼籲（CTA）  
  語氣輕快，emoji 自然點綴，重視情境共鳴。

- Facebook（150–250字）  
  敘事式：問題引發共鳴 → 產品賣點 → CTA  
  敘事感強，流暢自然，適合帶入使用者故事。

- 電商網站（100–200字）  
  標題句 + 條列式特色（3–5點）+ 使用場景（選填）+ CTA  
  用詞正式，說服力強，emoji 輔助不過度。

---

【促銷字句使用規範】

- 只有當「商品特色」欄位明確包含「限時優惠」、「促銷」、「折扣」或類似促銷字眼時，文案才可自然融入相關促銷內容。  
- 若「商品特色」中沒有提及促銷資訊，請勿自行加入任何限時優惠、折扣或促銷相關字句。  
- 促銷訊息要與語氣風格和平台調性相符。

---

【輸入格式】

- 平台：Facebook
- 語氣風格：${selectedTone}
- 商品類型：${identifiedProductName}
- 商品特色：${allSellingPoints.join('、')}

---

【輸出要求】

- 嚴格遵守平台字數限制。  
- 分三段輸出（Instagram）、或符合各平台結構，**僅輸出純文案內容，不要輸出段落標題或標註。**  
- 文案自然流暢，避免機器人語氣。  
- 包含明確且吸引人的行動呼籲（CTA）。

---

請根據以上要求，產出符合輸入條件的行銷文案。`,

      電商網站: `你是一位專業品牌文案撰寫師，擅長靈活運用三種語氣風格（簡潔、專業、輕鬆），並依據不同平台（Instagram、Facebook、電商網站）調整文案結構、字數與表達，產出貼近人類語感、自然流暢且具轉換力的行銷文案。

---

【語氣風格定義與句型範例】：

1. 簡潔  
- 重點明確，句子短促，動詞強烈。  
- 範例句：  
  「立即＋動作」  
  「功能＋一次搞定」  
  「產品＋幫你省下＋結果」

2. 專業  
- 語句正式，注重細節與可信度。  
- 範例句：  
  「專為＋對象＋設計」  
  「採用＋技術／材質＋確保＋結果」  
  「有效解決＋痛點，提升＋效益」

3. 輕鬆  
- 親切自然，口語化，帶情感與幽默。  
- 範例句：  
  「也太＋形容詞＋了吧！」  
  「不用想，直接＋動作」  
  「一用就回不去了」

---

【平台文案結構與字數】：

- Instagram（80–150字）  
  三段式：吸睛開頭 → 產品特色 → 行動呼籲（CTA）  
  語氣輕快，emoji 自然點綴，重視情境共鳴。

- Facebook（150–250字）  
  敘事式：問題引發共鳴 → 產品賣點 → CTA  
  敘事感強，流暢自然，適合帶入使用者故事。

- 電商網站（100–200字）  
  標題句 + 條列式特色（3–5點）+ 使用場景（選填）+ CTA  
  用詞正式，說服力強，emoji 輔助不過度。

---

【促銷字句使用規範】

- 只有當「商品特色」欄位明確包含「限時優惠」、「促銷」、「折扣」或類似促銷字眼時，文案才可自然融入相關促銷內容。  
- 若「商品特色」中沒有提及促銷資訊，請勿自行加入任何限時優惠、折扣或促銷相關字句。  
- 促銷訊息要與語氣風格和平台調性相符。

---

【輸入格式】

- 平台：電商網站
- 語氣風格：${selectedTone}
- 商品類型：${identifiedProductName}
- 商品特色：${allSellingPoints.join('、')}

---

【輸出要求】

- 嚴格遵守平台字數限制。  
- 分三段輸出（Instagram）、或符合各平台結構，**僅輸出純文案內容，不要輸出段落標題或標註。**  
- 文案自然流暢，避免機器人語氣。  
- 包含明確且吸引人的行動呼籲（CTA）。

---

請根據以上要求，產出符合輸入條件的行銷文案。`
    }

    // Determine which platforms to generate for
    let targetPlatforms = platforms || ["全部"];
    if (targetPlatforms.includes("全部")) {
      targetPlatforms = ["instagram", "facebook", "電商網站"];
    }

    // Security: Limit number of platforms
    targetPlatforms = targetPlatforms.slice(0, 5);

    // Using Gemini for text generation
    const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate copy for each platform
    for (const platform of targetPlatforms) {
      if (platformPrompts[platform as keyof typeof platformPrompts]) {
        try {
          const result = await textModel.generateContent([
            platformPrompts[platform as keyof typeof platformPrompts]
          ]);
          const response = await result.response;
          let textContent = response.text();

          safeLog(`Gemini ${platform} Response received`);

          // Security: Validate and sanitize response
          if (!textContent || textContent.length > 20000) {
            throw new Error('Invalid response length');
          }

          // Clean up the response
          textContent = textContent.replace(/```[^`]*```/g, '').replace(/`/g, '').trim();
          
          // Security: Limit response length
          textContent = textContent.substring(0, 5000);
          
          platformResults[platform] = textContent || "文案生成失敗，請稍後再試";

        } catch (e) {
          safeError(`Failed to generate copy for ${platform}:`, e);
          platformResults[platform] = "此平台文案生成暫時無法使用，請稍後再試";
        }
      }
    }

    if (image) {
      // For image input, return product name along with platform results
      return NextResponse.json({ 
        product_name: identifiedProductName, 
        selling_points: identifiedSellingPoints, 
        platform_results: platformResults 
      })
    } else {
      // For text input, return platform results
      return NextResponse.json({ platform_results: platformResults })
    }
  } catch (error) {
    safeError('Error during API call:', error)
    // Security: Return generic error message to user
    return NextResponse.json({ 
      text: "服務暫時無法使用，請稍後再試" 
    }, { status: 500 })
  }
}
