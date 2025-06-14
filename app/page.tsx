"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import ImageUpload from "@/components/ImageUpload"

export default function Home() {
  const [input, setInput] = useState("")
  const [tone, setTone] = useState<"搞笑" | "專業" | "簡潔">("搞笑")
  const [output, setOutput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentImageFile, setCurrentImageFile] = useState<File | null>(null)
  const [productNameUsedInOriginalCopy, setProductNameUsedInOriginalCopy] = useState("") // Tracks the product name initially used to generate the copy
  const [originalCopy, setOriginalCopy] = useState("") // Stores the original copy from the API
  const [displayCopy, setDisplayCopy] = useState("") // The copy currently displayed to the user
  const [customPoint, setCustomPoint] = useState("") // User-provided product selling point
  const [aiSuggestedSellingPoints, setAiSuggestedSellingPoints] = useState<string[]>([]) // New state for AI suggested selling points

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-8 text-center">
          SnapScript
        </h1>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>生成文案</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <ImageUpload onImageChange={handleImageChange} />
                <div className="grid gap-2">
                  <Label htmlFor="input">商品名稱</Label>
                  <div className="flex gap-2">
                    <Input
                      id="input"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={currentImageFile ? "AI辨識中..." : "請輸入商品名稱"}
                      disabled={isLoading}
                      className="flex-grow"
                    />
                    <Button
                      onClick={handleUpdateProductNameInCopy}
                      disabled={isLoading || !originalCopy || !input || input === productNameUsedInOriginalCopy}
                    >
                      確認
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tone">語氣</Label>
                  <Select value={tone} onValueChange={(value: "搞笑" | "專業" | "簡潔") => setTone(value)} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇語氣" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="搞笑">搞笑</SelectItem>
                      <SelectItem value="專業">專業</SelectItem>
                      <SelectItem value="簡潔">簡潔</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customPoint">產品賣點</Label>
                  <Input
                    id="customPoint"
                    value={customPoint}
                    onChange={(e) => setCustomPoint(e.target.value)}
                    placeholder="請輸入產品賣點（例如：防水輕量、925純銀、榮獲設計獎）"
                    disabled={isLoading}
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
                <Button onClick={handleGenerate} disabled={isLoading || (!input && !currentImageFile)}>
                  {isLoading ? "生成中..." : "生成文案"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {(output || displayCopy) && (
            <Card>
              <CardHeader>
                <CardTitle>生成結果</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={displayCopy || output}
                  readOnly
                  className="min-h-[200px]"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}