import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    gemini_key_exists: !!process.env.GEMINI_API_KEY,
    
    node_env: process.env.NODE_ENV,
    site_url: process.env.NEXT_PUBLIC_SITE_URL,
    message: "API 測試成功"
  })
}
