"use client"

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Header() {
  return (
    <div className="flex items-center gap-2">
      <Image 
        src="/SS Logo.svg"
        alt="SnapScript Logo"
        width={190}
        height={30}
        className="h-8 w-auto"
      />
    </div>
  )
} 