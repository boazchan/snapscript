"use client"

import React from 'react'
import Link from 'next/link'
import { Camera, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <Camera className="h-6 w-6" />
            <span className="font-bold text-xl">SnapScript</span>
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
              首頁
            </Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              關於
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              價格
            </Link>
          </nav>
          
          <Button variant="outline" size="sm" className="hidden md:flex">
            登入
          </Button>
          <Button size="sm" className="hidden md:flex">
            開始使用
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="container py-4 space-y-4">
            <nav className="flex flex-col space-y-3">
              <Link 
                href="/" 
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                首頁
              </Link>
              <Link 
                href="/about" 
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                關於
              </Link>
              <Link 
                href="/pricing" 
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                價格
              </Link>
            </nav>
            <div className="flex flex-col space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                登入
              </Button>
              <Button size="sm" className="w-full">
                開始使用
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
} 