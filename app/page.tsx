"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import ImageUpload from "@/components/ImageUpload"
import Header from "@/components/Header"
import { Camera, Sparkles, Copy, Check } from "lucide-react"

export default function Home() {
  const [input, setInput] = useState("")
  const [tone, setTone] = useState<"搞笑" | "專業" | "簡潔" | "">("")
  const [output, setOutput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentImageFile, setCurrentImageFile] = useState<File | null>(null)
  const [productNameUsedInOriginalCopy, setProductNameUsedInOriginalCopy] = useState("") // Tracks the product name initially used to generate the copy
  const [originalCopy, setOriginalCopy] = useState("") // Stores the original copy from the API
  const [displayCopy, setDisplayCopy] = useState("") // The copy currently displayed to the user
  const [customPoint, setCustomPoint] = useState("") // User-provided product selling point
  const [aiSuggestedSellingPoints, setAiSuggestedSellingPoints] = useState<string[]>([]) // New state for AI suggested selling points
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({}) // State for copy button feedback per platform
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["全部"])
  const [platformResults, setPlatformResults] = useState<{[key: string]: string}>({})
  const [loadingDots, setLoadingDots] = useState("")
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [analyzingDots, setAnalyzingDots] = useState("")

  const platforms = [
    { id: "全部", label: "全部" },
    { id: "facebook", label: "facebook" }, 
    { id: "instagram", label: "Instagram" },
    { id: "電商網站", label: "網站平台" }
  ]

  // 動態點點效果 - 文案生成
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingDots(prev => {
          if (prev === "") return "."
          if (prev === ".") return ".."
          if (prev === "..") return "..."
          return ""
        })
      }, 500) // 每500毫秒更新一次

      return () => clearInterval(interval)
    } else {
      setLoadingDots("")
    }
  }, [isLoading])

  // 動態點點效果 - 圖片分析
  useEffect(() => {
    if (isAnalyzingImage) {
      const interval = setInterval(() => {
        setAnalyzingDots((prev: string) => {
          if (prev === "") return "."
          if (prev === ".") return ".."
          if (prev === "..") return "..."
          return ""
        })
      }, 500) // 每500毫秒更新一次

      return () => clearInterval(interval)
    } else {
      setAnalyzingDots("")
    }
  }, [isAnalyzingImage])

  const handlePlatformChange = (platformId: string) => {
    if (platformId === "全部") {
      setSelectedPlatforms(["全部"])
    } else {
      setSelectedPlatforms(prev => {
        const filtered = prev.filter(p => p !== "全部")
        if (filtered.includes(platformId)) {
          const newSelection = filtered.filter(p => p !== platformId)
          return newSelection.length === 0 ? ["全部"] : newSelection
        } else {
          return [...filtered, platformId]
        }
      })
    }
  }

  const handleGenerate = async () => {
    if (!input && !currentImageFile) {
      alert("請輸入商品名稱或上傳圖片")
      return
    }

    setIsLoading(true)
    setOutput("")
    setOriginalCopy("")
    setDisplayCopy("")
    setProductNameUsedInOriginalCopy("")
    setPlatformResults({})

    try {
      let data: { text?: string; product_name?: string; selling_points?: string[]; platform_results?: {[key: string]: string} }

      if (currentImageFile) {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const base64Image = e.target?.result as string
          const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: base64Image,
              tone,
              customPoint,
              platforms: selectedPlatforms,
            }),
          })
          data = await response.json()
          if (data.product_name) {
            setInput(data.product_name) // Populate input with AI-detected name
            setProductNameUsedInOriginalCopy(data.product_name)
            if (data.platform_results) {
              setPlatformResults(data.platform_results)
              // For backward compatibility, set original and display copy to the first platform result
              const firstPlatformResult = Object.values(data.platform_results)[0] || ""
              setOriginalCopy(firstPlatformResult)
              setDisplayCopy(firstPlatformResult)
            }
            if (data.selling_points) {
              setAiSuggestedSellingPoints(data.selling_points) // Set AI suggested selling points
            }
          } else {
            setOutput(data.text || "產生失敗")
          }
          setIsLoading(false)
        }
        reader.readAsDataURL(currentImageFile)
      } else {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item: input,
            tone,
            customPoint,
            platforms: selectedPlatforms,
          }),
        })
        data = await response.json()
        setProductNameUsedInOriginalCopy(input) // Use current input as the product name for original copy
        if (data.platform_results) {
          setPlatformResults(data.platform_results)
          // For backward compatibility, set original and display copy to the first platform result
          const firstPlatformResult = Object.values(data.platform_results)[0] || ""
          setOriginalCopy(firstPlatformResult)
          setDisplayCopy(firstPlatformResult)
          setOutput(firstPlatformResult) // Fallback for pure text output (if image not used)
        } else {
          setOutput(data.text || "產生失敗")
        }
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error:", error)
      setOutput("產生失敗，請稍後再試")
      setIsLoading(false)
    }
  }

  const handleImageChange = (file: File | null) => {
    setCurrentImageFile(file)
    // Always clear previous results when image selection changes or is cleared
    setInput("")
    setOutput("")
    setOriginalCopy("")
    setDisplayCopy("")
    setProductNameUsedInOriginalCopy("")
    setAiSuggestedSellingPoints([]) // Clear suggested selling points on image change
    setPlatformResults({})

    if (file) {
      setIsAnalyzingImage(true) // Set analyzing state when image is being processed
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string
        try {
          const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: base64Image,
              analyzeOnly: true, // 只進行分析，不生成文案
            }),
          })
          const data: { text?: string; product_name?: string; selling_points?: string[] } = await response.json()
          if (data.product_name) {
            setInput(data.product_name) // Populate input with AI-detected name immediately
            if (data.selling_points) {
              setAiSuggestedSellingPoints(data.selling_points) // Set AI suggested selling points
            }
          } else {
            // Handle cases where product_name is not returned (e.g., error or no clear product)
            setOutput(data.text || "AI 辨識商品名稱失敗，請手動輸入。")
          }
        } catch (error) {
          console.error("Error during image analysis:", error)
          setOutput("圖片分析失敗，請稍後再試或手動輸入商品名稱。")
        } finally {
          setIsAnalyzingImage(false) // Clear analyzing state after processing
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateProductNameInCopy = () => {
    if (!input || (!originalCopy && Object.keys(platformResults).length === 0) || !productNameUsedInOriginalCopy) {
      console.error("Missing input, originalCopy/platformResults, or productNameUsedInOriginalCopy");
      alert("請先生成文案並確認商品名稱")
      return;
    }

    console.log("Updating product name in copy...");
    console.log("Product name used in original copy:", productNameUsedInOriginalCopy);
    console.log("New product name (from input):", input);

    // Use regex to replace the product name in the copy
    // Escape special characters in productNameUsedInOriginalCopy to be used in regex
    const escapedProductName = productNameUsedInOriginalCopy.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
    const regex = new RegExp(escapedProductName, 'g');

    // Update platform results if they exist
    if (Object.keys(platformResults).length > 0) {
      const updatedPlatformResults: {[key: string]: string} = {};
      Object.entries(platformResults).forEach(([platform, text]) => {
        updatedPlatformResults[platform] = text.replace(regex, input);
        console.log(`Updated ${platform} copy:`, updatedPlatformResults[platform]);
      });
      setPlatformResults(updatedPlatformResults);
      
      // Also update the first platform result for backward compatibility
      const firstPlatformResult = Object.values(updatedPlatformResults)[0] || "";
      setOriginalCopy(firstPlatformResult);
      setDisplayCopy(firstPlatformResult);
    } else if (originalCopy) {
      // Fallback for single copy
      const updatedCopy = originalCopy.replace(regex, input);
      console.log("Updated copy:", updatedCopy);
      setDisplayCopy(updatedCopy);
      setOriginalCopy(updatedCopy);
    }

    setProductNameUsedInOriginalCopy(input); // Update the tracker to the new product name for future edits
  }

  const handleAddSellingPoint = (point: string) => {
    setCustomPoint((prev) => {
      if (prev.includes(point)) return prev; // Avoid adding duplicates
      return prev === "" ? point : `${prev}、${point}`;
    });
  };

  const handleCopyToClipboard = async (text: string, platformId?: string) => {
    if (!text) return

    const key = platformId || 'single'

    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates(prev => ({ ...prev, [key]: true }))
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [key]: false })), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedStates(prev => ({ ...prev, [key]: true }))
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [key]: false })), 2000)
    }
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        width: '1440px',
        height: '1024px',
        position: 'relative'
      }}
    >
      {/* Background */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1600px',
          height: '1200px',
          backgroundImage: 'url(/background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.2
        }}
      />
      
      {/* Gradient Overlay */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1440px',
          height: '1024px',
          background: 'linear-gradient(135deg, rgba(82, 132, 247, 0.1) 0%, rgba(208, 78, 231, 0.1) 100%)'
        }}
      />

      {/* Main Content */}
      <div className="flex" style={{ position: 'relative', zIndex: 1 }}>
        {/* Left Panel */}
        <div 
          style={{
            width: '456px',
            height: '1024px',
            backgroundColor: '#F7F8FA',
            border: '1px solid #EEF0F2',
            borderRadius: '16px',
            margin: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Header */}
          <Header />
          
          {/* Form Content */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '14px',
            flex: 1
          }}>
            {/* Image Upload */}
            <div 
              style={{
                backgroundColor: '#FFFFFF',
                border: '2px dashed rgba(229, 229, 229, 0.5)',
                borderRadius: '16px',
                padding: '12px 18px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <ImageUpload onImageChange={handleImageChange} />
            </div>

            {/* Product Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label 
                style={{
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: 600,
                  lineHeight: '16.94px',
                  color: '#000000'
                }}
              >
                商品名稱
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isAnalyzingImage ? `AI辨識中${analyzingDots}` : "請輸入"}
                  disabled={isAnalyzingImage}
                  style={{
                    backgroundColor: isAnalyzingImage ? '#F0F8FF' : '#FFFFFF',
                    border: '0.5px solid rgba(229, 229, 229, 0.5)',
                    borderRadius: '8px',
                    padding: '10px',
                    height: '48px',
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    color: '#000000',
                    flex: 1
                  }}
                />
                {originalCopy && input !== productNameUsedInOriginalCopy && input.trim() !== '' && (
                  <Button
                    onClick={handleUpdateProductNameInCopy}
                    disabled={isLoading}
                    style={{ height: '48px', whiteSpace: 'nowrap' }}
                  >
                    更換商品名稱
                  </Button>
                )}
              </div>
            </div>

            {/* Tone Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label 
                style={{
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: 600,
                  lineHeight: '16.94px',
                  color: '#000000'
                }}
              >
                語氣
              </label>
              <Select value={tone} onValueChange={(value: "搞笑" | "專業" | "簡潔" | "") => setTone(value)} disabled={isLoading}>
                <SelectTrigger
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '0.5px solid rgba(229, 229, 229, 0.5)',
                    borderRadius: '8px',
                    padding: '10px',
                    width: '265px',
                    height: '48px',
                    fontFamily: 'Nunito Sans',
                    fontSize: '14px',
                    color: '#000000'
                  }}
                >
                  <SelectValue placeholder="請選擇" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="搞笑">搞笑</SelectItem>
                  <SelectItem value="專業">專業</SelectItem>
                  <SelectItem value="簡潔">簡潔</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Product Selling Points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label 
                style={{
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: 600,
                  lineHeight: '16.94px',
                  color: '#000000'
                }}
              >
                產品賣點
              </label>
              <Input
                value={customPoint}
                onChange={(e) => setCustomPoint(e.target.value)}
                placeholder="請輸入"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '0.5px solid rgba(229, 229, 229, 0.5)',
                  borderRadius: '8px',
                  padding: '10px',
                  height: '48px',
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  color: '#000000'
                }}
              />
            </div>

            {/* Platform Selection */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignSelf: 'stretch',
              gap: '12px'
            }}>
              <label 
                style={{
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: 600,
                  lineHeight: '1.21em',
                  textAlign: 'left',
                  color: '#000000'
                }}
              >
                應用平台
              </label>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'row',
                alignSelf: 'stretch'
              }}>
                {platforms.map((platform) => (
                  <div 
                    key={platform.id} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'row',
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '0px 12px 24px 0px',
                      cursor: 'pointer'
                    }}
                    onClick={() => handlePlatformChange(platform.id)}
                  >
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'row',
                      alignItems: 'center', 
                      gap: '12px'
                    }}>
                      <div 
                        style={{
                          display: 'flex',
                          width: '20px',
                          height: '20px',
                          backgroundColor: '#FFFFFF',
                          border: '0.5px solid rgba(229, 229, 229, 0.3)',
                          borderRadius: '6px',
                          position: 'relative'
                        }}
                      >
                        {selectedPlatforms.includes(platform.id) && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '12px',
                              height: '12px',
                              backgroundColor: '#9245E5',
                              borderRadius: '2px'
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <span 
                      style={{
                        fontFamily: 'Inter',
                        fontSize: '14px',
                        fontWeight: 400,
                        lineHeight: '1.21em',
                        textAlign: 'left',
                        color: '#000000'
                      }}
                    >
                      {platform.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              style={{
                backgroundColor: 'rgba(146, 69, 229, 0.1)',
                borderRadius: '8px',
                padding: '10px',
                height: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                marginTop: 'auto'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '4px', width: '24px', height: '24px' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 1L8 15M1 8L15 8" stroke="#9245E5" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span 
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '18px',
                    fontWeight: 500,
                    lineHeight: '21.78px',
                    color: '#9245E5'
                  }}
                >
                  {isLoading ? `開始生成${loadingDots}` : '開始生成'}
                </span>
              </div>
            </Button>

            {/* AI Suggested Selling Points */}
            {aiSuggestedSellingPoints.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#000000' }}>AI 建議賣點：</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {aiSuggestedSellingPoints.map((point, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSellingPoint(point)}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      + {point}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Results */}
        <div 
          style={{
            flex: 1,
            margin: '16px 16px 16px 0',
            backgroundColor: '#FFFFFF',
            borderRadius: '6px',
            padding: '16px 0px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}
        >
          {!output && Object.keys(platformResults).length === 0 ? (
            <>
              <h2 
                style={{
                  fontFamily: 'Inter',
                  fontSize: '18px',
                  fontWeight: 400,
                  lineHeight: '21.78px',
                  color: '#000000',
                  textAlign: 'center'
                }}
              >
                文案結果將顯示在這裡
              </h2>
              <p 
                style={{
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: '16.94px',
                  color: 'rgba(0, 0, 0, 0.8)',
                  textAlign: 'center'
                }}
              >
                請填寫左側表單並點擊「開始生成」
              </p>
            </>
          ) : (
            <div style={{ width: '100%', maxWidth: '600px' }}>
              {Object.keys(platformResults).length > 0 ? (
                Object.entries(platformResults).map(([platform, text]) => (
                  <Card key={platform} style={{ marginBottom: '16px' }}>
                    <CardHeader>
                      <CardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{platform}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyToClipboard(text, platform)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {copiedStates[platform] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copiedStates[platform] ? '已複製' : '複製'}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{text}</p>
                    </CardContent>
                  </Card>
                ))
              ) : output && (
                <Card>
                  <CardHeader>
                    <CardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>生成結果</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToClipboard(output, 'single')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {copiedStates['single'] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedStates['single'] ? '已複製' : '複製'}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{output}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}