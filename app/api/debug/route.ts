import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(req: Request) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    step: "開始",
    errors: []
  }

  try {
    // Step 1: Environment check
    debugInfo.step = "環境檢查"
    debugInfo.environment = {
      gemini_key_exists: !!process.env.GEMINI_API_KEY,
      google_key_exists: !!process.env.GOOGLE_AI_API_KEY,
      node_env: process.env.NODE_ENV
    }

    // Step 2: Google AI API test
    debugInfo.step = "Google AI API 測試"
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY!)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      
      // Simple test
      const result = await model.generateContent(["測試：請回答 'API 測試成功'"])
      const response = await result.response
      const text = response.text()
      
      debugInfo.aiTest = {
        success: true,
        response: text.substring(0, 100)
      }
    } catch (e: any) {
      debugInfo.errors.push(`Google AI API 錯誤: ${e.message}`)
      debugInfo.aiTest = {
        success: false,
        error: e.message
      }
    }

    debugInfo.step = "檢查完成"
    debugInfo.success = debugInfo.errors.length === 0
    return NextResponse.json(debugInfo)

  } catch (error: any) {
    debugInfo.errors.push(`未預期錯誤: ${error.message}`)
    debugInfo.step = `錯誤發生在: ${debugInfo.step}`
    return NextResponse.json(debugInfo)
  }
}
