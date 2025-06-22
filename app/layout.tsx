import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import SecurityWrapper from "./components/SecurityWrapper"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "SnapScript Beta",
  description: "上傳商品圖片，AI 自動生成 Instagram、Facebook、電商網站專用文案。快速、專業、多平台適用。",
  keywords: "AI文案, 商品文案, Instagram文案, Facebook文案, 電商文案, 圖片分析",
  authors: [{ name: "SnapScript Team" }],
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: "SnapScript Beta",
    description: "上傳商品圖片，AI 自動生成專業文案",
    type: "website",
    locale: "zh_TW",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // 防止用戶縮放，但這可能影響可訪問性
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
        style={{
          backgroundImage: 'url(/background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
        suppressHydrationWarning={true}
      >
        <SecurityWrapper>
          {children}
        </SecurityWrapper>
      </body>
    </html>
  )
}