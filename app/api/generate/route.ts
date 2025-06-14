// app/api/generate/route.ts

import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Access your API key as an environment variable (or directly if you must).
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { item, tone, image, customPoint }: {
      item?: string; // Optional: if an item name is directly provided (without image)
      tone: "搞笑" | "專業" | "簡潔";
      image?: string; // Optional: base64 image data
      customPoint?: string; // Optional: user-provided product selling point
    } = await req.json()

    const tonePromptMap = {
      "搞笑": "以幽默風趣、輕鬆搞笑的語氣，加入時下流行梗或誇張的描述，讓人會心一笑並想分享。",
      "專業": "以權威、專業、資訊豐富的語氣，強調產品的技術優勢、品質保證或獨特功能，給人可靠、信任感。",
      "簡潔": "以簡潔有力、直擊人心的語氣，用最少的文字傳達產品的核心價值和行動呼籲，快速抓住讀者注意力。",
    }

    let identifiedProductName: string = item || "" // Initialize with provided item or empty string
    let identifiedSellingPoints: string[] = [] // New: Initialize identified selling points
    let finalCopy: string = ""

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
    }

    // --- Step 2: Generate IG Copy (requires identifiedProductName) ---
    if (!identifiedProductName) {
      return NextResponse.json({ text: "請輸入商品名稱或上傳圖片以生成文案。" }, { status: 400 })
    }

    const igCopySystemPrompt = `你是一位專業的 Instagram 行銷文案寫手。請根據以下條件撰寫一段 IG 貼文文案（繁體中文）：

- 商品名稱：${identifiedProductName}
- 語氣風格：${tone}（搞笑、專業、簡潔）
${customPoint ? `- 使用者補充的產品賣點：${customPoint}` : ''}

條件：
- ${customPoint ? '將產品賣點合理融入文案中' : ''}
- 加入 emoji 與 hashtag
- 控制在 2～4 行，可直接貼 IG 使用
- 文風要自然、吸睛、有情境感與吸引力
請以 JSON 格式回應，僅包含一個鍵 'text'，其值為 IG 貼文文案。`

    const igCopyUserPrompt = `請根據以上資訊，撰寫一段繁體中文 IG 文案，語氣為「${tonePromptMap[tone]}」${customPoint ? `，並融入產品賣點「${customPoint}」` : ''}。`

    // Using Gemini for text generation as well for consistency, or keep OpenAI if preferred
    const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Updated to gemini-1.5-flash for text generation

    try {
      const result = await textModel.generateContent([
        igCopySystemPrompt,
        igCopyUserPrompt
      ]);
      const response = await result.response;
      let textContent = response.text();

      console.log("Raw Gemini Copy Response Text:", textContent); // Added for debugging

      // Use regex to extract JSON content from markdown code block if present
      const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        textContent = jsonMatch[1];
      }

      console.log("Processed Gemini Copy Text for JSON parsing:", textContent); // Added for debugging

      const parsedCopyContent = JSON.parse(textContent);
      finalCopy = parsedCopyContent.text?.trim() || "產生失敗，請稍後再試";

    } catch (e) {
      console.error("Failed to get or parse copy API response from Gemini:", e);
      return NextResponse.json({ text: "文案生成失敗，請稍後再試。" }, { status: 500 });
    }

    if (image) {
      // For image input, return product name along with the copy
      return NextResponse.json({ product_name: identifiedProductName, selling_points: identifiedSellingPoints, text: finalCopy })
    } else {
      // For text input, just return the copy
      return NextResponse.json({ text: finalCopy })
    }
  } catch (error) {
    console.error('Error during API call:', error)
    // Return a generic error message to the user
    return NextResponse.json({ text: "文案生成或圖片分析失敗" }, { status: 500 })
  }
}
