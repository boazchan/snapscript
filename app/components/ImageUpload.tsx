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
  const [isHovering, setIsHovering] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
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
    setIsClicking(true)
    setTimeout(() => setIsClicking(false), 150)
    fileInputRef.current?.click()
  }

  const handleMouseEnter = () => {
    setIsHovering(true)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
  }

  return (
    <div style={{ width: '100%' }}>
      {!imagePreview ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'stretch',
            gap: '10px',
            backgroundColor: isDragging ? 'rgba(146, 69, 229, 0.05)' : 'transparent',
            borderRadius: '16px',
            width: '100%',
            height: '200px',
            transition: 'all 0.2s ease-in-out',
            border: isDragging ? '2px dashed rgba(146, 69, 229, 0.3)' : 'none'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Main Content Container */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            alignSelf: 'stretch',
            gap: '18px'
          }}>
            {/* Image Icon */}
            <div 
              style={{ 
                width: '42px', 
                height: '41px',
                transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M28.6182 3.71777C34.5279 3.71777 38.499 7.75282 38.499 13.7764V27.8086C38.499 28.0666 38.4515 28.2975 38.4375 28.5469C38.4288 28.692 38.4312 28.8373 38.4189 28.9824C38.4119 29.0473 38.3927 29.107 38.3857 29.1719C38.328 29.7082 38.2385 30.2207 38.1143 30.7178C38.0828 30.851 38.0455 30.9795 38.0088 31.1094C37.8688 31.591 37.7045 32.0504 37.5068 32.4893C37.4491 32.6123 37.3857 32.7303 37.3262 32.8516C37.1127 33.2701 36.882 33.6716 36.6143 34.0439C36.532 34.1584 36.4412 34.2611 36.3555 34.3721C36.0773 34.7239 35.7869 35.0605 35.458 35.3662C35.3513 35.4652 35.2301 35.5506 35.1182 35.6445C34.7804 35.9281 34.4354 36.2003 34.0557 36.4326C33.9193 36.5162 33.7688 36.5773 33.6289 36.6523C33.2422 36.8607 32.8519 37.0645 32.4268 37.2217C32.2518 37.2866 32.057 37.3206 31.875 37.377C31.457 37.5033 31.0442 37.6348 30.5947 37.71C30.2552 37.768 29.8853 37.7747 29.5283 37.8037C29.2239 37.8259 28.9349 37.8848 28.6182 37.8848H13.3652C12.7073 37.8847 12.0788 37.819 11.4717 37.7217C11.4491 37.7183 11.4281 37.7153 11.4072 37.7119C9.03956 37.3139 7.0745 36.1982 5.69727 34.5156C5.68152 34.5156 5.68079 34.4988 5.66504 34.4834C4.28083 32.7819 3.49902 30.494 3.49902 27.8086V13.7764C3.49906 7.75292 7.47317 3.71791 13.3652 3.71777H28.6182ZM13.3652 6.10059C8.85567 6.10072 5.94238 9.11959 5.94238 13.7764V27.8086C5.94238 29.1155 6.19096 30.2824 6.61621 31.292C6.67729 31.2206 10.0575 27.1957 10.0752 27.1797C11.2862 25.8301 13.5602 23.8181 16.5439 25.0361C17.2613 25.3265 17.8914 25.7351 18.4688 26.0938C19.4713 26.7479 20.0614 27.0552 20.6738 27.0039C20.9274 26.9697 21.1651 26.8963 21.3906 26.7598C22.3671 26.1721 25.1277 22.2428 25.2939 22.0293C27.2014 19.6037 30.1409 18.9547 32.5908 20.3896C32.9198 20.581 35.277 22.1882 36.0576 22.834V13.7764C36.0576 9.11949 33.1436 6.10059 28.6182 6.10059H13.3652ZM14.8379 10.5508C16.0588 10.5508 17.1642 11.052 17.9561 11.8516C18.7513 12.6231 19.25 13.6861 19.25 14.8467C19.25 17.1613 17.2662 19.0917 14.8838 19.0918C12.7896 19.0918 11.0037 17.5979 10.6035 15.6641C10.5374 15.374 10.5 15.0757 10.5 14.7676C10.5001 12.4364 12.4402 10.5508 14.8379 10.5508Z" fill={isDragging ? "#9245E5" : "black"}/>
              </svg>
            </div>
            
            {/* Text Area */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              alignSelf: 'stretch',
              gap: '15px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <p 
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '1.21em',
                    textAlign: 'center',
                    color: '#292D32',
                    margin: 0,
                    marginBottom: '15px'
                  }}
                >
                  拖曳圖片到此處上傳
                </p>
                <p 
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '1.21em',
                    textAlign: 'center',
                    color: '#A9ACB4',
                    margin: 0
                  }}
                >
                  或
                </p>
              </div>
              
              {/* Upload Button */}
              <div style={{ width: '88px', height: '33px' }}>
                <Button
                  type="button"
                  onClick={handleUploadClick}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 16px',
                    backgroundColor: isHovering ? '#9245E5' : '#FFFFFF',
                    border: `1px solid ${isHovering ? '#9245E5' : '#CBD0DC'}`,
                    borderRadius: '6px',
                    width: '88px',
                    height: '33px',
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '1.21em',
                    color: isHovering ? '#FFFFFF' : '#54575C',
                    transform: isClicking ? 'scale(0.95)' : isHovering ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.2s ease-in-out',
                    boxShadow: 'none',
                    cursor: 'pointer'
                  }}
                >
                  點擊上傳
                </Button>
              </div>
            </div>
            
            {/* Format Description */}
            <p 
              style={{
                fontFamily: 'Inter',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '1.21em',
                textAlign: 'center',
                color: '#A9ACB4',
                width: '100%',
                margin: 0
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
          className="relative rounded-md overflow-hidden flex justify-center items-center"
          style={{
            backgroundColor: 'transparent',
            borderRadius: '16px',
            width: '100%',
            height: '200px'
          }}
        >
          <img
            src={imagePreview}
            alt="Image Preview"
            className="rounded-md object-cover"
            style={{
              maxWidth: '200px',
              maxHeight: '200px',
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