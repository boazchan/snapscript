"use client"

import { useState } from "react"
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
  const [isCopied, setIsCopied] = useState(false) // State for copy button feedback

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

    try {
      let data: { text: string; product_name?: string; selling_points?: string[] }

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
            }),
          })
          data = await response.json()
          if (data.product_name) {
            setInput(data.product_name) // Populate input with AI-detected name
            setProductNameUsedInOriginalCopy(data.product_name)
            setOriginalCopy(data.text)
            setDisplayCopy(data.text)
            if (data.selling_points) {
              setAiSuggestedSellingPoints(data.selling_points) // Set AI suggested selling points
            }
          } else {
            setOutput(data.text)
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
          }),
        })
        data = await response.json()
        setProductNameUsedInOriginalCopy(input) // Use current input as the product name for original copy
        setOriginalCopy(data.text)
        setDisplayCopy(data.text)
        setOutput(data.text) // Fallback for pure text output (if image not used)
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

    if (file) {
      setIsLoading(true) // Set loading state when image is being processed
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string
        try {
          const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: base64Image,
              tone, // Use current tone for initial analysis
              customPoint, // Use current customPoint for initial analysis
            }),
          })
          const data: { text: string; product_name?: string; selling_points?: string[] } = await response.json()
          if (data.product_name) {
            setInput(data.product_name) // Populate input with AI-detected name immediately
            if (data.selling_points) {
              setAiSuggestedSellingPoints(data.selling_points) // Set AI suggested selling points
            }
            // Note: Full copy generation with originalCopy/displayCopy will happen on handleGenerate
          } else {
            // Handle cases where product_name is not returned (e.g., error or no clear product)
            setOutput(data.text || "AI 辨識商品名稱失敗，請手動輸入。")
          }
        } catch (error) {
          console.error("Error during image analysis:", error)
          setOutput("圖片分析失敗，請稍後再試或手動輸入商品名稱。")
        } finally {
          setIsLoading(false) // Clear loading state after processing
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateProductNameInCopy = () => {
    if (!input || !originalCopy || !productNameUsedInOriginalCopy) {
      console.error("Missing input, originalCopy, or productNameUsedInOriginalCopy");
      alert("請先生成文案並確認商品名稱")
      return;
    }

    console.log("Updating product name in copy...");
    console.log("Original copy:", originalCopy);
    console.log("Product name used in original copy:", productNameUsedInOriginalCopy);
    console.log("New product name (from input):", input);

    // Use regex to replace the product name in the copy
    // Escape special characters in productNameUsedInOriginalCopy to be used in regex
    const escapedProductName = productNameUsedInOriginalCopy.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
    const regex = new RegExp(escapedProductName, 'g');
    const updatedCopy = originalCopy.replace(regex, input);

    console.log("Updated copy:", updatedCopy);
    setDisplayCopy(updatedCopy);
    setProductNameUsedInOriginalCopy(input); // Update the tracker to the new product name for future edits
  }

  const handleAddSellingPoint = (point: string) => {
    setCustomPoint((prev) => {
      if (prev.includes(point)) return prev; // Avoid adding duplicates
      return prev === "" ? point : `${prev}、${point}`;
    });
  };

  const handleCopyToClipboard = async () => {
    const textToCopy = displayCopy || output
    if (!textToCopy) return

    try {
      await navigator.clipboard.writeText(textToCopy)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = textToCopy
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
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
                    fontFamily: 'Noto Sans TC',
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
                    placeholder={currentImageFile ? "AI辨識中..." : "請輸入"}
                    disabled={isLoading}
                    className="flex-grow"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '0.5px solid rgba(180, 201, 207, 0.5)',
                      borderRadius: '6px',
                      padding: '10px',
                      height: '48px',
                      fontFamily: 'Nunito Sans',
                      fontSize: '14px',
                      color: '#000000'
                    }}
                  />
                  <Button
                    onClick={handleUpdateProductNameInCopy}
                    disabled={isLoading || !originalCopy || !input || input === productNameUsedInOriginalCopy}
                    style={{
                      height: '48px'
                    }}
                  >
                    確認
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label 
                  htmlFor="tone"
                  style={{
                    fontFamily: 'Nunito Sans',
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
              <div className="grid gap-2">
                <Label 
                  htmlFor="customPoint"
                  style={{
                    fontFamily: 'Noto Sans TC',
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
                    fontFamily: 'Nunito Sans',
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
              disabled={isLoading || (!input && !currentImageFile)}
              style={{
                backgroundColor: '#4554E5',
                borderRadius: '32px',
                padding: '8px 82px',
                fontFamily: 'Inter',
                fontSize: '18px',
                fontWeight: 500,
                lineHeight: '21.78px',
                color: '#FFFFFF'
              }}
            >
              {isLoading ? "生成中..." : "開始生成"}
            </Button>
          </div>
        </div>

        {/* Right Result Area */}
        <div 
          className="flex-grow flex flex-col"
          style={{
            padding: '24px'
          }}
        >
          {(output || displayCopy) ? (
            <Card className="max-w-4xl w-full" style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              maxHeight: '600px',
              height: 'auto'
            }}>
              <CardHeader style={{ paddingBottom: '12px' }}>
                <CardTitle 
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '20px',
                    fontWeight: 600,
                    color: '#1C1C1C'
                  }}
                >
                  生成結果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={displayCopy || output}
                  readOnly
                  className="resize-none"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '16px',
                    lineHeight: '1.5',
                    backgroundColor: '#F8F9FA',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '16px',
                    minHeight: '300px',
                    maxHeight: '450px'
                  }}
                />
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={handleCopyToClipboard}
                    disabled={!displayCopy && !output}
                    className="flex items-center gap-2"
                    style={{
                      backgroundColor: isCopied ? '#10B981' : '#4554E5',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontFamily: 'Inter',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {isCopied ? '已複製' : '複製文案'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div 
              className="flex items-center justify-center max-w-4xl w-full"
              style={{
                border: '2px dashed rgba(229, 231, 235, 0.8)',
                borderRadius: '12px',
                backgroundColor: 'rgba(248, 249, 250, 0.8)',
                maxHeight: '600px',
                height: '400px'
              }}
            >
              <div className="text-center">
                <div 
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '18px',
                    fontWeight: 500,
                    color: '#6B7280',
                    marginBottom: '8px'
                  }}
                >
                  文案結果將顯示在這裡
                </div>
                <div 
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    color: '#9CA3AF'
                  }}
                >
                  請填寫左側表單並點擊「開始生成」
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}