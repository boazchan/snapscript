// app/api/generate/route.ts

import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Access your API key as an environment variable (or directly if you must).
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { item, tone, image, customPoint, platforms, analyzeOnly }: {
      item?: string; // Optional: if an item name is directly provided (without image)
      tone?: "搞笑" | "專業" | "簡潔";
      image?: string; // Optional: base64 image data
      customPoint?: string; // Optional: user-provided product selling point
      platforms?: string[]; // Optional: selected platforms for generation
      analyzeOnly?: boolean; // Optional: only analyze image without generating copy
    } = await req.json()

    let identifiedProductName: string = item || "" // Initialize with provided item or empty string
    let identifiedSellingPoints: string[] = [] // New: Initialize identified selling points
    let platformResults: {[key: string]: string} = {}

    // --- Step 1: Identify Product Name and Selling Points from Image (if image is provided) ---
    if (image) {
      // For Gemini, convert base64 to GoogleGenerativeAI.Part object
      const base64ToGenerativePart = (base64String: string) => {
        // Remove the data:image/jpeg;base64, prefix
        const [, data] = base64String.split(',');
        return {
          inlineData: {
            data: data,
            mimeType: "image/jpeg", // Assuming JPEG. You might want to infer this from the base64 string.
          },
        };
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

        console.log("Raw Gemini Vision Response Text:", textContent); // Added for debugging

        // Use regex to extract JSON content from markdown code block if present
        const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          textContent = jsonMatch[1];
        }

        console.log("Processed Gemini Vision Text for JSON parsing:", textContent); // Added for debugging

        // Try to parse the JSON output from Gemini
        const parsedVisionContent = JSON.parse(textContent);
        identifiedProductName = parsedVisionContent.item?.trim() || "";
        identifiedSellingPoints = Array.isArray(parsedVisionContent.selling_points) ? parsedVisionContent.selling_points.map((sp: string) => sp.trim()) : [];

      } catch (e) {
        console.error("Failed to get or parse vision API response from Gemini:", e);
        return NextResponse.json({ text: "無法辨識圖片中的產品名稱或賣點，請稍後再試或手動輸入關鍵字。" }, { status: 400 });
      }

      if (!identifiedProductName) {
        return NextResponse.json({ text: "無法辨識圖片中的產品名稱，請稍後再試或手動輸入關鍵字。" }, { status: 400 })
      }

      // If analyzeOnly is true, return only the analysis results
      if (analyzeOnly) {
        return NextResponse.json({ 
          product_name: identifiedProductName, 
          selling_points: identifiedSellingPoints 
        })
      }
    }

    // --- Step 2: Generate Copy (requires identifiedProductName) ---
    if (!identifiedProductName) {
      return NextResponse.json({ text: "請輸入商品名稱或上傳圖片以生成文案。" }, { status: 400 })
    }

    // Combine identified selling points with custom point if provided
    let allSellingPoints = [...identifiedSellingPoints];
    if (customPoint && customPoint.trim()) {
      allSellingPoints.push(customPoint.trim());
    }

    // Platform-specific prompts
    const platformPrompts = {
      instagram: `你是一位 Instagram 社群行銷專家，擅長撰寫吸引年輕用戶的貼文文案。

請依據以下產品資訊，撰寫一段 80～150 字的 Instagram 貼文文案：

1. 開頭需自然融入「商品名稱」
2. 語氣活潑、有趣，符合 Instagram 年輕用戶喜好
3. 適度使用 emoji 增加視覺吸引力
4. 包含明確的行動呼籲 (CTA)
5. 至少提及兩個產品賣點，但要自然融入文案中
6. 風格要符合 Instagram 限時動態或貼文的調性

產品資訊：
商品名稱：${identifiedProductName}
賣點：${allSellingPoints.join('、')}

請直接輸出文案，不需額外解釋。`,

      facebook: `你是一位 Facebook 粉專經營專家，擅長撰寫理性與感性並重的貼文內容。

請依據以下產品資訊，撰寫一段 150～250 字的 Facebook 貼文文案：

1. 開頭需自然融入「商品名稱」
2. 語氣專業但親切，適合廣泛年齡層
3. 內容要有理性說服力，提供具體產品優勢
4. 結尾包含相關 hashtag (3-5個)
5. 至少詳細說明兩個主要賣點
6. 可包含使用情境描述或客戶需求痛點

產品資訊：
商品名稱：${identifiedProductName}
賣點：${allSellingPoints.join('、')}

請直接輸出文案，不需額外解釋。`,

      電商網站: `你是一位電商平台文案專家，擅長撰寫促進購買轉換的商品描述。

請依據以下產品資訊，撰寫一段 100～200 字的電商商品描述文案：

1. 開頭需自然融入「商品名稱」
2. 內容結構化、條理清晰，易於快速閱讀
3. 重點突出產品核心價值與差異化優勢
4. 包含具體的產品特色描述
5. 語氣專業可信，建立購買信心
6. 適合用於商品詳情頁面或商品列表描述

產品資訊：
商品名稱：${identifiedProductName}
賣點：${allSellingPoints.join('、')}

請直接輸出文案，不需額外解釋。`
    }

    // Determine which platforms to generate for
    let targetPlatforms = platforms || ["全部"];
    if (targetPlatforms.includes("全部")) {
      targetPlatforms = ["instagram", "facebook", "電商網站"];
    }

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

          console.log(`Raw Gemini ${platform} Response Text:`, textContent);

          // Clean up the response
          textContent = textContent.replace(/```[^`]*```/g, '').replace(/`/g, '').trim();
          
          platformResults[platform] = textContent || "產生失敗，請稍後再試";

        } catch (e) {
          console.error(`Failed to generate copy for ${platform}:`, e);
          platformResults[platform] = "此平台文案生成失敗，請稍後再試。";
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
    console.error('Error during API call:', error)
    // Return a generic error message to the user
    return NextResponse.json({ text: "文案生成或圖片分析失敗" }, { status: 500 })
  }
}
