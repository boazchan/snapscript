import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  onImageChange: (file: File | null) => void
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageChange }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    processFile(file)
  }

  const processFile = (file: File | null) => {
    if (!file) {
      onImageChange(null)
      setImagePreview(null)
      return
    }

    // 文件大小檢查 (4MB = 4 * 1024 * 1024 bytes)
    const maxSize = 4 * 1024 * 1024
    if (file.size > maxSize) {
      alert('文件大小超過限制！請選擇小於 4mb 的文件。')
      return
    }

    // 文件格式檢查
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      alert('不支援的文件格式！請選擇 JPEG 或 PNG 圖片。')
      return
    }

    onImageChange(file)

    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    onImageChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div style={{ width: '484px' }}>
      {!imagePreview ? (
        <div
          className={cn(
            "transition-colors",
            isDragging ? "border-blue-400 bg-blue-50/50" : ""
          )}
          style={{
            backgroundColor: '#FFFFFF',
            border: '2px dashed rgba(180, 201, 207, 0.5)',
            borderRadius: '6px',
            padding: '12px 18px'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center" style={{ gap: '18px' }}>
            {/* Image Icon */}
            <div style={{ width: '68px', height: '68px' }}>
              <svg
                width="68"
                height="68"
                viewBox="0 0 68 68"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  opacity="0.4" 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M6.375 57.625C6.375 59.8341 8.16586 61.625 10.375 61.625H57.625C59.8341 61.625 61.625 59.8341 61.625 57.625V10.375C61.625 8.16586 59.8341 6.375 57.625 6.375H10.375C8.16586 6.375 6.375 8.16586 6.375 10.375V57.625Z" 
                  fill="#000000"
                />
                <path 
                  d="M11.6675 57.2306H56.7714L57.355 56.12L41.5762 33.2323L40.4145 33.2238L29.577 48.4388L22.5192 42.5341L21.5077 42.6475L11.1094 56.0888L11.6675 57.2306Z" 
                  fill="#000000"
                />
                <path 
                  d="M31.0334 24.296C31.0305 20.6976 28.098 17.768 24.4969 17.7651C20.8985 17.7651 17.9689 20.6948 17.9689 24.296C17.9689 27.9 20.8985 30.8296 24.4969 30.8296C28.1009 30.8296 31.0334 27.9 31.0334 24.296Z" 
                  fill="#000000"
                />
              </svg>
            </div>
            
            {/* Text Area */}
            <div className="flex flex-col items-center" style={{ gap: '15px', width: '100%' }}>
              <div className="text-center" style={{ gap: '15px' }}>
                <p 
                  className="font-medium"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '16.94px',
                    color: '#292D32',
                    width: '100%'
                  }}
                >
                  拖曳圖片到此處上傳
                </p>
                <p 
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '16.94px',
                    color: '#A9ACB4',
                    width: '100%',
                    marginTop: '15px'
                  }}
                >
                  或
                </p>
              </div>
              
              {/* Upload Button */}
              <Button
                type="button"
                onClick={handleUploadClick}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD0DC',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  width: '88px',
                  height: '33px',
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '16.94px',
                  color: '#54575C'
                }}
              >
                點擊上傳
              </Button>
            </div>
            
            {/* Format Description */}
            <p 
              style={{
                fontFamily: 'Inter',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '16.94px',
                color: '#A9ACB4',
                width: '100%',
                textAlign: 'center'
              }}
            >
              支援格式: JPEG, PNG 檔案大小限制為4mb內
            </p>
          </div>
          
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div 
          className="relative rounded-md overflow-hidden flex justify-center"
          style={{
            backgroundColor: '#FFFFFF',
            border: '2px dashed rgba(180, 201, 207, 0.5)',
            borderRadius: '6px',
            padding: '12px'
          }}
        >
          <img
            src={imagePreview}
            alt="Image Preview"
            className="rounded-md object-cover"
            style={{
              maxWidth: '200px',
              maxHeight: '150px',
              width: 'auto',
              height: 'auto'
            }}
          />
          <Button
            variant="outline"
            size="icon"
            className="absolute top-2 right-2 bg-red-500 text-white border-red-500 hover:bg-red-600"
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default ImageUpload