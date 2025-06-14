import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { input, tone, image }: { input?: string; tone: "搞笑" | "專業" | "簡潔"; image?: string } = await req.json()

    const tonePrompt = {
      "搞笑": "語氣要幽默搞笑，像是在寫梗圖一樣",
      "專業": "語氣要正式、具專業性，像商業簡報或新聞稿",
      "簡潔": "語氣要簡單有力，像一句 slogan 或廣告標語",
    }

    let prompt = ""
    let model = "gpt-3.5-turbo"
    let messages: any[] = []

    if (input) {
      prompt = `請幫我針對「${input}」這個關鍵字，寫一段吸引人的行銷文案。${tonePrompt[tone] || ""} 使用繁體中文。`
      messages = [{ role: "user", content: prompt }]
    } else if (image) {
      // For image analysis, the prompt will be more detailed for Instagram copy
      model = "gpt-4o"
      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `請根據這張圖片中的產品，生成一段可以直接貼到 Instagram 上的繁體中文行銷文案。文案需包含：\n- 吸引人的短文\n- 與產品相關的 emoji\n- 至少三個相關的 hashtag\n\n請根據以下語氣來撰寫：${tonePrompt[tone] || ""}`
            },
            {
              type: "image_url",
              image_url: {
                url: image
              }
            }
          ]
        }
      ]
    } else {
      return NextResponse.json({ error: "No input or image provided" }, { status: 400 })
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.8,
        max_tokens: 500
      }),
    })

    const data = await response.json()
    console.log("OpenAI API response data:", data)
    const text = data.choices?.[0]?.message?.content ?? "產生失敗，請稍後再試"

    return NextResponse.json({ text })
  } catch (error) {
    console.error('Error analyzing image:', error)
    return NextResponse.json({ error: "圖片分析失敗" }, { status: 500 })
  }
} 