'use client'

import { useEffect, useState } from 'react'

interface SecurityWrapperProps {
  children: React.ReactNode
}

export default function SecurityWrapper({ children }: SecurityWrapperProps) {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    // 只在生產環境啟用安全檢查
    if (process.env.NODE_ENV !== 'production') {
      return
    }

    let devtools = {
      open: false,
      orientation: null as string | null
    }

    // 檢測開發者工具
    const threshold = 160
    setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold
      const heightThreshold = window.outerHeight - window.innerHeight > threshold
      const orientation = widthThreshold ? 'vertical' : 'horizontal'

      if (!(heightThreshold && widthThreshold) &&
          ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || widthThreshold || heightThreshold)) {
        if (!devtools.open || devtools.orientation !== orientation) {
          devtools.open = true
          devtools.orientation = orientation
          setIsDevToolsOpen(true)
        }
      } else {
        if (devtools.open) {
          devtools.open = false
          devtools.orientation = null
          setIsDevToolsOpen(false)
        }
      }
    }, 500)

    // 防止右鍵菜單
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // 防止常見的開發者快捷鍵
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74)) {
        e.preventDefault()
        return false
      }
      
      // Ctrl+U
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault()
        return false
      }
    }

    // 檢測控制台使用
    let consoleWarningShown = false
    const originalConsole = { ...console }
    
    ;(['log', 'debug', 'info', 'warn', 'error'] as const).forEach(method => {
      console[method] = function(...args: any[]) {
        if (!consoleWarningShown) {
          consoleWarningShown = true
          setIsBlocked(true)
          setTimeout(() => setIsBlocked(false), 3000)
        }
        return originalConsole[method].apply(console, args)
      }
    })

    // 防止選取文字
    const handleSelectStart = (e: Event) => {
      e.preventDefault()
      return false
    }

    // 防止拖拽
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault()
      return false
    }

    // 添加事件監聽器
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('selectstart', handleSelectStart)
    document.addEventListener('dragstart', handleDragStart)

    // 清理函數
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('dragstart', handleDragStart)
      
      // 恢復原始 console
      ;(['log', 'debug', 'info', 'warn', 'error'] as const).forEach(method => {
        console[method] = originalConsole[method]
      })
    }
  }, [])

  // 開發者工具檢測警告
  if (isDevToolsOpen && process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen bg-red-900 flex items-center justify-center">
        <div className="text-center text-white p-8">
          <h1 className="text-4xl font-bold mb-4">⚠️ 安全警告</h1>
          <p className="text-xl mb-4">檢測到開發者工具已開啟</p>
          <p className="text-lg opacity-80">請關閉開發者工具以繼續使用</p>
          <div className="mt-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  // 控制台使用警告
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-yellow-900 flex items-center justify-center">
        <div className="text-center text-white p-8">
          <h1 className="text-4xl font-bold mb-4">🔒 安全提醒</h1>
          <p className="text-xl mb-4">檢測到異常操作</p>
          <p className="text-lg opacity-80">正在恢復正常模式...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// 定義 window 對象的額外屬性
declare global {
  interface Window {
    Firebug?: {
      chrome?: {
        isInitialized?: boolean
      }
    }
  }
} 