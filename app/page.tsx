"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import ImageUpload from "@/components/ImageUpload"
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
    <main 
      className="min-h-screen relative flex flex-col"
      style={{
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <div 
        className="w-full flex flex-col justify-center"
        style={{
          height: '56px',
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 4px 4px 0px rgba(194, 194, 194, 0.25)',
          padding: '10px 16px',
          gap: '10px',
          position: 'relative',
          zIndex: 10
        }}
      >
        <div className="flex flex-row items-center" style={{ gap: '14px', width: '100%' }}>
          <h1 
            style={{ 
              fontFamily: 'Inter',
              fontSize: '20px',
              fontWeight: 400,
              lineHeight: '24.2px',
              color: '#1C1C1C'
            }}
          >
            SnapScript Beta
          </h1>
          <h2 
            style={{ 
              fontFamily: 'Inter',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '16.94px',
              color: '#1C1C1C'
            }}
          >
            文案生成
          </h2>
        </div>
      </div>

      {/* Main Content Area - Left and Right Layout */}
      <div className="flex flex-row" style={{ height: 'calc(100vh - 56px)' }}>
        {/* Left Operation Area */}
        <div 
          className="flex flex-col"
          style={{
            width: '516px',
            height: '100%',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div 
            className="flex-grow"
            style={{
              background: '#F0F1FD',
              borderLeft: '0.5px solid #CDCDDF',
              borderRadius: '0px',
              padding: '16px'
            }}
          >
            <div className="flex flex-col" style={{ 
              width: '484px',
              gap: '14px'
            }}>
              <ImageUpload onImageChange={handleImageChange} />
              <div className="grid gap-2">
                <Label 
                  htmlFor="input"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: '16.8px',
                    color: '#000000'
                  }}
                >
                  商品名稱
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isAnalyzingImage ? `AI辨識中${analyzingDots}` : "請輸入"}
                    disabled={isAnalyzingImage}
                    className={`${originalCopy && input !== productNameUsedInOriginalCopy ? "flex-grow" : "w-full"} ${isAnalyzingImage ? 'animate-pulse' : ''}`}
                    style={{
                      backgroundColor: isAnalyzingImage ? '#F0F8FF' : '#FFFFFF',
                      border: isAnalyzingImage ? '2px solid #4554E5' : '0.5px solid rgba(180, 201, 207, 0.5)',
                      borderRadius: '6px',
                      padding: '10px',
                      height: '48px',
                      fontFamily: 'Inter',
                      fontSize: '14px',
                      color: isAnalyzingImage ? '#4554E5' : '#000000',
                      fontWeight: isAnalyzingImage ? 600 : 400
                    }}
                  />
                  {originalCopy && input !== productNameUsedInOriginalCopy && input.trim() !== '' && (
                    <Button
                      onClick={handleUpdateProductNameInCopy}
                      disabled={isLoading}
                      style={{
                        height: '48px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      更換商品名稱
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label 
                  htmlFor="tone"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: '19.1px',
                    color: '#000000'
                  }}
                >
                  語氣
                </Label>
                <Select value={tone} onValueChange={(value: "搞笑" | "專業" | "簡潔" | "") => setTone(value)} disabled={isLoading}>
                  <SelectTrigger
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '0.5px solid rgba(180, 201, 207, 0.5)',
                      borderRadius: '6px',
                      padding: '10px',
                      width: '265px',
                      height: '48px',
                      fontFamily: 'Inter',
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
              <div className="grid gap-2">
                <Label 
                  htmlFor="customPoint"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: '16.8px',
                    color: '#000000'
                  }}
                >
                  產品賣點
                </Label>
                <Input
                  id="customPoint"
                  value={customPoint}
                  onChange={(e) => setCustomPoint(e.target.value)}
                  placeholder="請輸入"
                  disabled={isLoading}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '0.5px solid rgba(180, 201, 207, 0.5)',
                    borderRadius: '6px',
                    padding: '10px',
                    height: '48px',
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    color: '#000000'
                  }}
                />
                {aiSuggestedSellingPoints.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {aiSuggestedSellingPoints.map((point, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSellingPoint(point)}
                        disabled={isLoading}
                      >
                        {point}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label 
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: '16.8px',
                    color: '#000000'
                  }}
                >
                  應用平台
                </Label>
                <div className="flex flex-row">
                  {platforms.map((platform) => (
                    <div 
                      key={platform.id}
                      className="flex items-center gap-3"
                      style={{ padding: '0px 24px 24px 0px' }}
                    >
                      <div 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => handlePlatformChange(platform.id)}
                      >
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            border: '0.5px solid rgba(180, 201, 207, 0.3)',
                            borderRadius: '6px',
                            backgroundColor: selectedPlatforms.includes(platform.id) ? '#4554E5' : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {selectedPlatforms.includes(platform.id) && (
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#FFFFFF',
                                borderRadius: '2px'
                              }}
                            />
                          )}
                        </div>
                        <span
                          style={{
                            fontFamily: 'Inter',
                            fontSize: '14px',
                            fontWeight: 400,
                            lineHeight: '19.1px',
                            color: '#000000'
                          }}
                        >
                          {platform.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Generate Button */}
          <div 
            className="flex justify-center items-center"
            style={{
              width: '516px',
              height: '81px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0px -4px 4px 0px rgba(194, 194, 194, 0.25)',
              padding: '16px 10px',
              gap: '10px',
              position: 'relative',
              zIndex: 2
            }}
          >
            <Button 
              onClick={handleGenerate} 
              disabled={isLoading || isAnalyzingImage || (!input && !currentImageFile)}
              style={{
                backgroundColor: '#4554E5',
                borderRadius: '32px',
                padding: '8px 82px',
                fontFamily: 'Inter',
                fontSize: '18px',
                fontWeight: 500,
                lineHeight: '21.78px',
                color: '#FFFFFF',
                width: '200px',
                minWidth: '200px'
              }}
            >
              {(isLoading && !isAnalyzingImage) ? `生成中${loadingDots}` : "開始生成"}
            </Button>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex justify-center items-center">
          {Object.keys(platformResults).length > 0 ? (
            <div className="w-full max-w-5xl px-6 -mt-24">
              <h2 className="text-2xl font-semibold text-white mb-6">生成結果</h2>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(platformResults).map(([platform, text]) => (
                  <Card key={platform} className="bg-white shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-medium">
                        {platform === 'instagram' ? 'Instagram' : 
                         platform === 'facebook' ? 'Facebook' : 
                         platform === '電商網站' ? '電商網站' : platform}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0 pb-4">
                      <div 
                        className="bg-gray-50 p-4 rounded border whitespace-pre-wrap text-sm"
                        style={{ height: '400px', overflowY: 'auto' }}
                      >
                        {text}
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(text, platform) }}
                          disabled={!text}
                          className="flex items-center gap-2"
                          style={{
                            backgroundColor: copiedStates[platform] ? '#10B981' : '#3B82F6',
                            color: 'white'
                          }}
                        >
                          {copiedStates[platform] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copiedStates[platform] ? '已複製' : '複製文案'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="w-full max-w-md mx-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className={`h-12 w-12 text-white mb-4 ${(isLoading && !isAnalyzingImage) ? 'animate-dramatic-blink' : ''}`} />
                <h3 className="text-xl font-medium text-white mb-2">
                  {(isLoading && !isAnalyzingImage) ? `生成中${loadingDots}` : '文案結果將顯示在這裡'}
                </h3>
                <p className="text-white/80">
                  {(isLoading && !isAnalyzingImage) ? '請稍候，AI正在為您生成文案' : '請填寫左側表單並點擊「開始生成」'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}