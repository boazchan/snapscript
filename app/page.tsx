"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import ImageUpload from "@/components/ImageUpload"
import Header from "@/components/Header"

export default function Home() {
  const [input, setInput] = useState("")
  const [tone, setTone] = useState<"輕鬆" | "專業" | "簡潔" | "">("")
  const [output, setOutput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentImageFile, setCurrentImageFile] = useState<File | null>(null)
  const [productNameUsedInOriginalCopy, setProductNameUsedInOriginalCopy] = useState("") // Tracks the product name initially used to generate the copy
  const [originalCopy, setOriginalCopy] = useState("") // Stores the original copy from the API
  const [displayCopy, setDisplayCopy] = useState("") // The copy currently displayed to the user
  const [customPoint, setCustomPoint] = useState("") // User-provided product selling point
  const [aiSuggestedSellingPoints, setAiSuggestedSellingPoints] = useState<string[]>([]) // New state for AI suggested selling points
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["全部"])
  const [platformResults, setPlatformResults] = useState<{[key: string]: string}>({})
  const [loadingDots, setLoadingDots] = useState("")
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [analyzingDots, setAnalyzingDots] = useState("")
  const [isGenerateButtonHovering, setIsGenerateButtonHovering] = useState(false)
  const [isGenerateButtonClicking, setIsGenerateButtonClicking] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGettingSuggestions, setIsGettingSuggestions] = useState(false)
  const [suggestionsTimeout, setSuggestionsTimeout] = useState<NodeJS.Timeout | null>(null)
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({}) // 追蹤每個平台的複製狀態
  const [copyButtonHover, setCopyButtonHover] = useState<{[key: string]: boolean}>({}) // 追蹤每個複製按鈕的 hover 狀態
  const [editingStates, setEditingStates] = useState<{[key: string]: boolean}>({}) // 追蹤每個平台的編輯狀態
  const [editingTexts, setEditingTexts] = useState<{[key: string]: string}>({}) // 存儲編輯中的文案

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

  // 清理 timeout 的 useEffect
  useEffect(() => {
    return () => {
      if (suggestionsTimeout) {
        clearTimeout(suggestionsTimeout);
      }
    };
  }, [suggestionsTimeout])

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
    setIsGenerating(true)
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
          try {
            const base64Image = e.target?.result as string
            const response = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image: base64Image,
                item: input.trim() || undefined, // 如果用戶有輸入，優先使用用戶的輸入
                tone,
                customPoint,
                platforms: selectedPlatforms,
              }),
            })
            
            // 檢查響應是否為 JSON 格式
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              const errorText = await response.text();
              console.error('Non-JSON response:', errorText);
              setOutput("服務暫時無法使用，請稍後再試");
              setIsLoading(false);
              setIsGenerating(false);
              return;
            }

            try {
              data = await response.json()
            } catch (jsonError) {
              console.error('Failed to parse JSON response:', jsonError);
              setOutput("服務響應格式錯誤，請稍後再試");
              setIsLoading(false);
              setIsGenerating(false);
              return;
            }
          if (data.product_name) {
            // 只有當用戶沒有手動輸入時，才使用 AI 分析的產品名稱
            const finalProductName = input.trim() || data.product_name;
            setInput(finalProductName);
            setProductNameUsedInOriginalCopy(finalProductName);
            
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
          setIsGenerating(false)
          } catch (readerError) {
            console.error('Error in image reader:', readerError);
            setOutput("圖片處理失敗，請稍後再試");
            setIsLoading(false);
            setIsGenerating(false);
          }
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
        
        // 檢查響應是否為 JSON 格式
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const errorText = await response.text();
          console.error('Non-JSON response:', errorText);
          setOutput("服務暫時無法使用，請稍後再試");
          setIsLoading(false);
          setIsGenerating(false);
          return;
        }

        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          setOutput("服務響應格式錯誤，請稍後再試");
          setIsLoading(false);
          setIsGenerating(false);
          return;
        }
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
        setIsGenerating(false)
      }
    } catch (error) {
      console.error("Error:", error)
      setOutput("產生失敗，請稍後再試")
      setIsLoading(false)
      setIsGenerating(false)
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
    
    // 當刪除圖片時（file 為 null），清空所有用戶選擇和輸入
    if (file === null) {
      setTone("") // 清空語氣選擇
      setCustomPoint("") // 清空產品賣點
      setSelectedPlatforms(["全部"]) // 重置平台選擇為預設值
    }
    
    // 清除文字建議的 timeout
    if (suggestionsTimeout) {
      clearTimeout(suggestionsTimeout);
      setSuggestionsTimeout(null);
    }
    setIsGettingSuggestions(false)

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
          
          // 檢查響應是否為 JSON 格式
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const errorText = await response.text();
            console.error('Non-JSON response:', errorText);
            setOutput("圖片分析服務暫時無法使用，請稍後再試");
            setIsAnalyzingImage(false);
            return;
          }

          let data: { text?: string; product_name?: string; selling_points?: string[] };
          try {
            data = await response.json();
          } catch (jsonError) {
            console.error('Failed to parse JSON response:', jsonError);
            setOutput("服務響應格式錯誤，請稍後再試");
            setIsAnalyzingImage(false);
            return;
          }
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
          setOutput("無法辨識圖片中的產品名稱或賣點，請提供目標商品的其他圖片，或手動輸入關鍵字。")
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

    // 智能替換函數 - 處理商品名稱和類似名稱
    const smartReplace = (text: string, oldName: string, newName: string, isInstagram: boolean = false) => {
      let updatedText = text;
      
      // 1. 直接替換完整的商品名稱
      const escapedOldName = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exactRegex = new RegExp(escapedOldName, 'g');
      updatedText = updatedText.replace(exactRegex, newName);
      
      // 2. 處理商品名稱的各個部分（例如："Nike Air Max" -> ["Nike", "Air", "Max"]）
      const oldNameParts = oldName.split(/\s+/).filter(part => part.length > 1);
      const newNameParts = newName.split(/\s+/).filter(part => part.length > 1);
      
      // 如果新舊名稱都有多個部分，嘗試部分替換
      if (oldNameParts.length > 1 && newNameParts.length > 1) {
        oldNameParts.forEach((oldPart, index) => {
          if (newNameParts[index]) {
            const escapedOldPart = oldPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // 只替換獨立的詞彙，避免誤替換
            const partRegex = new RegExp(`\\b${escapedOldPart}\\b`, 'g');
            updatedText = updatedText.replace(partRegex, newNameParts[index]);
          }
        });
      }
      
      // 3. 特別處理 Instagram 標籤
      if (isInstagram) {
        console.log('=== Instagram Hashtag Processing ===');
        console.log('Old name:', oldName);
        console.log('New name:', newName);
        console.log('Original text:', updatedText);
        
        // 處理完整商品名稱的 hashtag（移除空格和特殊字符）
        const oldHashtag = oldName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '');
        const newHashtag = newName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '');
        
        console.log('Old hashtag cleaned:', oldHashtag);
        console.log('New hashtag cleaned:', newHashtag);
        
        // 記錄已處理過的hashtag，避免重複替換
        const processedHashtags = new Set<string>();
        
        // 處理完整商品名稱的 hashtag
        if (oldHashtag && newHashtag && oldHashtag !== newHashtag && !processedHashtags.has(oldHashtag)) {
          // 優先使用精確匹配
          const exactPattern = new RegExp(`#${oldHashtag}(?=[\\s#]|$)`, 'gi');
          if (exactPattern.test(updatedText)) {
            updatedText = updatedText.replace(exactPattern, `#${newHashtag}`);
            console.log(`Exact pattern matched: #${oldHashtag} -> #${newHashtag}`);
            processedHashtags.add(oldHashtag);
          } else {
            // 如果精確匹配失敗，使用全局匹配
            const globalPattern = new RegExp(`#${oldHashtag}`, 'gi');
            if (globalPattern.test(updatedText)) {
              updatedText = updatedText.replace(globalPattern, `#${newHashtag}`);
              console.log(`Global pattern matched: #${oldHashtag} -> #${newHashtag}`);
              processedHashtags.add(oldHashtag);
            }
          }
        }
        
        // 處理商品名稱各部分的 hashtag
        console.log('Processing name parts...');
        console.log('Old parts:', oldNameParts);
        console.log('New parts:', newNameParts);
        
        oldNameParts.forEach((oldPart, index) => {
          if (newNameParts[index] && oldPart.length > 1) {
            // 清理部分名稱，移除特殊字符
            const cleanOldPart = oldPart.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '');
            const cleanNewPart = newNameParts[index].replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '');
            
            console.log(`Processing part ${index}: "${cleanOldPart}" -> "${cleanNewPart}"`);
            
            if (cleanOldPart && cleanNewPart && cleanOldPart !== cleanNewPart && !processedHashtags.has(cleanOldPart)) {
              // 策略1: 獨立hashtag匹配 (如 #Nike)
              const independentPattern = new RegExp(`#${cleanOldPart}(?=[\\s#]|$)`, 'gi');
              if (independentPattern.test(updatedText)) {
                updatedText = updatedText.replace(independentPattern, `#${cleanNewPart}`);
                console.log(`Independent hashtag matched: #${cleanOldPart} -> #${cleanNewPart}`);
                processedHashtags.add(cleanOldPart);
              } else {
                // 策略2: 複合hashtag匹配 (如 #NikeShoes 中的 Nike)
                const compoundPattern = new RegExp(`#([^\\s#]*?)${cleanOldPart}([^\\s#]*?)(?=[\\s#]|$)`, 'gi');
                if (compoundPattern.test(updatedText)) {
                  updatedText = updatedText.replace(compoundPattern, (match, prefix, suffix) => {
                    const result = `#${prefix}${cleanNewPart}${suffix}`;
                    console.log(`Compound hashtag: ${match} -> ${result}`);
                    return result;
                  });
                  processedHashtags.add(cleanOldPart);
                }
              }
            }
          }
        });
        
        console.log('Final Instagram text:', updatedText);
        console.log('=== End Instagram Processing ===');
      }
      
      return updatedText;
    };

    // Update platform results if they exist
    if (Object.keys(platformResults).length > 0) {
      const updatedPlatformResults: {[key: string]: string} = {};
      const updatedEditingTexts: {[key: string]: string} = {};
      
      Object.entries(platformResults).forEach(([platform, text]) => {
        const isInstagram = platform === 'instagram';
        
        // 決定要更新的文本來源：如果用戶編輯過，使用編輯的文本；否則使用原始文本
        const sourceText = editingTexts[platform] !== undefined ? editingTexts[platform] : text;
        const updatedText = smartReplace(sourceText, productNameUsedInOriginalCopy, input, isInstagram);
        
        updatedPlatformResults[platform] = updatedText;
        
        // 如果用戶編輯過這個平台的文案，也要更新 editingTexts
        if (editingTexts[platform] !== undefined) {
          updatedEditingTexts[platform] = updatedText;
        }
        
        console.log(`Updated ${platform} copy:`, updatedText);
      });
      
      setPlatformResults(updatedPlatformResults);
      
      // 更新編輯文本狀態
      if (Object.keys(updatedEditingTexts).length > 0) {
        setEditingTexts(prev => ({ ...prev, ...updatedEditingTexts }));
      }
      
      // Also update the first platform result for backward compatibility
      const firstPlatformResult = Object.values(updatedPlatformResults)[0] || "";
      setOriginalCopy(firstPlatformResult);
      setDisplayCopy(firstPlatformResult);
    } else if (originalCopy) {
      // Fallback for single copy
      const updatedCopy = smartReplace(originalCopy, productNameUsedInOriginalCopy, input);
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

  // 獲取賣點建議的函數
  const fetchSellingPointSuggestions = async (productName: string) => {
    if (!productName.trim() || productName.trim().length < 2) {
      setAiSuggestedSellingPoints([]);
      return;
    }

    setIsGettingSuggestions(true);
    
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: productName.trim(),
          getSuggestionsOnly: true,
        }),
      });
      
      // 檢查響應是否為 JSON 格式
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response from suggestions API');
        setAiSuggestedSellingPoints([]);
        return;
      }

      const data: { selling_points?: string[] } = await response.json();
      if (data.selling_points && Array.isArray(data.selling_points)) {
        setAiSuggestedSellingPoints(data.selling_points);
      } else {
        setAiSuggestedSellingPoints([]);
      }
    } catch (error) {
      console.error("Error fetching selling point suggestions:", error);
      setAiSuggestedSellingPoints([]);
    } finally {
      setIsGettingSuggestions(false);
    }
  };

  // 處理商品名稱輸入變化的函數（帶防抖動）
  const handleInputChange = (value: string) => {
    setInput(value);
    
    // 清除之前的 timeout
    if (suggestionsTimeout) {
      clearTimeout(suggestionsTimeout);
    }
    
    // 清除現有建議
    if (!value.trim()) {
      setAiSuggestedSellingPoints([]);
      return;
    }
    
    // 設置新的 timeout（1.5秒後執行）
    const newTimeout = setTimeout(() => {
      if (!currentImageFile) { // 只在沒有圖片時才獲取建議
        fetchSellingPointSuggestions(value);
      }
    }, 1500);
    
    setSuggestionsTimeout(newTimeout);
  };

  const handleGenerateButtonMouseEnter = () => {
    setIsGenerateButtonHovering(true)
  }

  const handleGenerateButtonMouseLeave = () => {
    setIsGenerateButtonHovering(false)
  }

  const handleGenerateButtonClick = () => {
    setIsGenerateButtonClicking(true)
    setTimeout(() => setIsGenerateButtonClicking(false), 150)
    handleGenerate()
  }

  // 處理複製文案
  const handleCopyText = (platform: string, text: string) => {
    navigator.clipboard.writeText(text);
    
    // 設置該平台為已複製狀態
    setCopiedStates(prev => ({ ...prev, [platform]: true }));
    
    // 2秒後恢復為原始狀態
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [platform]: false }));
    }, 2000);
  }

  // 處理複製按鈕 hover
  const handleCopyButtonMouseEnter = (platform: string) => {
    setCopyButtonHover(prev => ({ ...prev, [platform]: true }));
  }

  const handleCopyButtonMouseLeave = (platform: string) => {
    setCopyButtonHover(prev => ({ ...prev, [platform]: false }));
  }

  // 編輯相關處理函數 - 簡化版
  const handleEditTextChange = (platform: string, value: string) => {
    setEditingTexts(prev => ({ ...prev, [platform]: value }))
  }



  return (
    <div 
      className="min-h-screen"
      style={{
        width: '100vw',
        minHeight: '100vh',
        position: 'relative'
      }}
    >
      {/* Background */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: 'url(/background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Main Content */}
      <div 
        className="flex main-content" 
        style={{ 
          position: 'relative', 
          zIndex: 1, 
          minHeight: '100vh',
          gap: '16px',
          padding: '16px',
          maxWidth: '1920px', // 最大寬度限制
          margin: '0 auto' // 居中對齊
        }}
      >
        {/* Left Panel */}
        <div 
          className="left-panel"
          style={{
            width: 'clamp(400px, 30vw, 500px)', // 響應式寬度，最小400px，最大500px
            minHeight: 'calc(100vh - 32px)',
            backgroundColor: '#F7F8FA',
            border: '1px solid #EEF0F2',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flexShrink: 0 // 防止左側面板縮小
          }}
        >
          {/* Header */}
          <Header />
          
          {/* Form Content */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '20px',
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
                height: '224px'
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
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} className="input-wrapper">
                <Input
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={isAnalyzingImage ? `AI辨識中${analyzingDots}` : isGettingSuggestions ? "獲取賣點建議中..." : "請輸入"}
                  disabled={isAnalyzingImage || isGettingSuggestions}
                  className={isAnalyzingImage ? 'ai-analyzing' : ''}
                  style={{
                    backgroundColor: isAnalyzingImage ? 'linear-gradient(135deg, rgba(146, 69, 229, 0.1), rgba(146, 69, 229, 0.05))' : '#FFFFFF',
                    border: isAnalyzingImage ? '1px solid rgba(146, 69, 229, 0.3)' : '0.5px solid rgba(229, 229, 229, 0.5)',
                    borderRadius: '8px',
                    padding: '10px',
                    height: '48px',
                    fontFamily: 'Inter',
                    fontSize: '16px', // 改為 16px 以防止手機瀏覽器自動放大
                    color: isAnalyzingImage ? '#9245E5' : '#000000',
                    flex: 1,
                    minWidth: '200px', // 最小寬度
                    transition: 'all 0.3s ease-in-out',
                    boxShadow: isAnalyzingImage ? '0 0 15px rgba(146, 69, 229, 0.2)' : 'none'
                  }}
                />
                {originalCopy && input.trim() !== '' && (
                  <Button
                    onClick={handleUpdateProductNameInCopy}
                    disabled={isLoading || input === productNameUsedInOriginalCopy}
                    style={{ 
                      height: '48px', 
                      whiteSpace: 'nowrap',
                      minWidth: 'fit-content',
                      opacity: input === productNameUsedInOriginalCopy ? 0.5 : 1
                    }}
                  >
                    更換商品名稱
                  </Button>
                                )}
              </div>
              {originalCopy && input.trim() !== '' && (
                <div style={{
                  fontSize: '12px',
                  color: input === productNameUsedInOriginalCopy ? '#999' : '#666',
                  fontFamily: 'Inter',
                  marginTop: '-8px'
                }}>
                  {input === productNameUsedInOriginalCopy 
                    ? '💡 修改商品名稱後會智能更新文案，與產品名稱相關的文字也會同步調整'
                    : '💡 修改商品名稱後會智能更新文案，與產品名稱相關的文字也會同步調整'
                  }
                </div>
              )}
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
                              <Select value={tone} onValueChange={(value: "輕鬆" | "專業" | "簡潔" | "") => setTone(value)} disabled={isLoading}>
                <SelectTrigger
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '0.5px solid rgba(229, 229, 229, 0.5)',
                    borderRadius: '8px',
                    padding: '10px',
                    width: '100%', // 響應式寬度
                    maxWidth: '300px', // 最大寬度限制
                    height: '48px',
                    fontFamily: 'Nunito Sans',
                    fontSize: '16px', // 改為 16px 以防止手機瀏覽器自動放大
                    color: '#000000'
                  }}
                >
                  <SelectValue placeholder="請選擇" />
                </SelectTrigger>
                <SelectContent>
                                      <SelectItem value="輕鬆">輕鬆</SelectItem>
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
                  fontSize: '16px', // 改為 16px 以防止手機瀏覽器自動放大
                  color: '#000000',
                  width: '100%'
                }}
              />
              
              {/* AI Suggested Selling Points */}
              {(aiSuggestedSellingPoints.length > 0 || isGettingSuggestions) && (
                <div 
                  className="ai-suggestions"
                  style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px',
                    maxHeight: '120px', // 限制高度
                    overflowY: 'auto' // 允許滾動
                  }}
                >
                  {isGettingSuggestions ? (
                    <div style={{ 
                      padding: '8px 12px', 
                      backgroundColor: '#f0f0f0', 
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      AI 建議生成中...
                    </div>
                  ) : (
                    aiSuggestedSellingPoints.map((point, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSellingPoint(point)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#9245E5';
                          e.currentTarget.style.color = '#FFFFFF';
                          e.currentTarget.style.borderColor = '#9245E5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#EDE6F8';
                          e.currentTarget.style.color = '#9245E5';
                          e.currentTarget.style.borderColor = '#EDE6F8';
                        }}
                        style={{
                          backgroundColor: '#EDE6F8',
                          borderColor: '#EDE6F8',
                          color: '#9245E5',
                          fontSize: '12px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        {point}
                      </Button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Platform Selection */}
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
                平台
              </label>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '12px' 
              }}>
                {platforms.map((platform) => (
                  <label key={platform.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontFamily: 'Inter',
                    color: '#000000',
                    minWidth: 'fit-content'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(platform.id)}
                      onChange={() => handlePlatformChange(platform.id)}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: '#9245E5'
                      }}
                    />
                    {platform.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateButtonClick}
              onMouseEnter={handleGenerateButtonMouseEnter}
              onMouseLeave={handleGenerateButtonMouseLeave}
              disabled={isLoading}
              style={{
                backgroundColor: isGenerateButtonHovering ? '#9245E5' : 'rgba(146, 69, 229, 0.1)',
                borderRadius: '8px',
                padding: '10px',
                height: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                marginTop: 'auto',
                transform: isGenerateButtonClicking ? 'scale(0.95)' : 'scale(1)',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div 
                  style={{ 
                    padding: '0px', 
                    width: '24px', 
                    height: '24px',
                    animation: (isGenerating || isGenerateButtonHovering) ? 'sparkle 2s ease-in-out infinite' : 'none'
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.60744 4.18038L8.15716 5.68256C7.78499 6.92452 6.84039 7.89599 5.63443 8.27906L4.17492 8.74251C3.94125 8.81634 3.94125 9.15698 4.17492 9.23082L5.63443 9.69428C6.8411 10.0773 7.78497 11.0495 8.15716 12.2908L8.60744 13.793C8.67918 14.0335 9.01014 14.0335 9.08188 13.793L9.53217 12.2908C9.90434 11.0488 10.8489 10.0773 12.0549 9.69428L13.5144 9.23082C13.7481 9.15699 13.7481 8.81636 13.5144 8.74251L12.0549 8.27906C10.8482 7.89601 9.90436 6.92379 9.53217 5.68256L9.08188 4.18038C9.01015 3.93987 8.6799 3.93987 8.60744 4.18038ZM17.0158 13.2411L17.3425 14.3324C17.6131 15.2345 18.2992 15.9414 19.1756 16.2191L20.236 16.5554C20.4057 16.6095 20.4057 16.8566 20.236 16.9106L19.1756 17.2469C18.2992 17.5254 17.6124 18.2315 17.3425 19.1336L17.0158 20.225C16.9633 20.3997 16.7232 20.3997 16.6706 20.225L16.3439 19.1336C16.0733 18.2315 15.3873 17.5247 14.5108 17.2469L13.4505 16.9106C13.2807 16.8565 13.2807 16.6095 13.4505 16.5554L14.5108 16.2191C15.3873 15.9406 16.0741 15.2345 16.3439 14.3324L16.6706 13.2411C16.7232 13.0663 16.964 13.0663 17.0158 13.2411ZM7.36235 17.5912V16.676C7.36235 16.5429 7.46676 16.4355 7.59603 16.4355C7.72529 16.4355 7.8297 16.5429 7.8297 16.676V17.5912C7.8297 17.7242 7.7253 17.8317 7.59603 17.8317C7.46748 17.8317 7.36235 17.7235 7.36235 17.5912ZM7.36235 19.9764V19.0612C7.36235 18.9282 7.46676 18.8207 7.59603 18.8207C7.72529 18.8207 7.8297 18.9282 7.8297 19.0612V19.9764C7.8297 20.1094 7.7253 20.2169 7.59603 20.2169C7.46748 20.2169 7.36235 20.1095 7.36235 19.9764ZM8.07614 18.3258C8.07614 18.1928 8.18054 18.0853 8.30981 18.0853H9.19901C9.32827 18.0853 9.43268 18.1928 9.43268 18.3258C9.43268 18.4589 9.32828 18.5663 9.19901 18.5663H8.30981C8.18055 18.5663 8.07614 18.4589 8.07614 18.3258ZM5.75941 18.3258C5.75941 18.1928 5.86381 18.0853 5.99308 18.0853H6.88228C7.01154 18.0853 7.11596 18.1928 7.11596 18.3258C7.11596 18.4589 7.01155 18.5663 6.88228 18.5663H5.99308C5.86382 18.5663 5.75941 18.4589 5.75941 18.3258ZM17.998 6.91136V5.99616C17.998 5.86312 18.1024 5.75566 18.2316 5.75566C18.3609 5.75566 18.4653 5.86311 18.4653 5.99616V6.91136C18.4653 7.04441 18.3609 7.15187 18.2316 7.15187C18.1031 7.15187 17.998 7.04441 17.998 6.91136ZM17.998 9.29583V8.38063C17.998 8.24759 18.1024 8.14013 18.2316 8.14013C18.3609 8.14013 18.4653 8.24758 18.4653 8.38063V9.29583C18.4653 9.42887 18.3609 9.53634 18.2316 9.53634C18.1031 9.53707 17.998 9.42888 17.998 9.29583ZM18.7124 7.64598C18.7124 7.51294 18.8168 7.40547 18.9461 7.40547H19.8353C19.9646 7.40547 20.069 7.51293 20.069 7.64598C20.069 7.77903 19.9646 7.88648 19.8353 7.88648H18.9461C18.8169 7.88648 18.7124 7.77903 18.7124 7.64598ZM16.395 7.64598C16.395 7.51294 16.4994 7.40547 16.6287 7.40547H17.5179C17.6471 7.40547 17.7515 7.51293 17.7515 7.64598C17.7515 7.77903 17.6471 7.88648 17.5179 7.88648H16.6287C16.4994 7.88648 16.395 7.77903 16.395 7.64598Z" fill={isGenerateButtonHovering ? "#FFFFFF" : "#9245E5"}/>
                  </svg>
                </div>
                <span 
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '18px',
                    fontWeight: 500,
                    lineHeight: '21.78px',
                    color: isGenerateButtonHovering ? '#FFFFFF' : '#9245E5'
                  }}
                >
                  {isLoading ? '生成中' : '開始生成'}
                </span>
              </div>
            </Button>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div 
          className="right-panel"
          style={{
            flex: 1,
            minHeight: 'calc(100vh - 32px)',
            position: 'relative',
            minWidth: '0', // 允許收縮
            overflow: 'hidden' // 防止內容溢出
          }}
        >
          {!output && Object.keys(platformResults).length === 0 ? (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(400px, 90%)', // 響應式寬度
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
              {isLoading ? (
                // 生成中狀態
                <>
                  <img 
                    src="/typing.gif" 
                    alt="正在生成"
                    style={{
                      width: '350px',
                      height: 'auto'
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '10px',
                      fontFamily: 'Inter',
                      fontSize: '16px',
                      fontWeight: 600,
                      lineHeight: '19.36px',
                      color: '#9245E5',
                      cursor: 'default',
                      userSelect: 'none'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'sparkle 1.5s ease-in-out infinite'
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.60744 4.18038L8.15716 5.68256C7.78499 6.92452 6.84039 7.89599 5.63443 8.27906L4.17492 8.74251C3.94125 8.81634 3.94125 9.15698 4.17492 9.23082L5.63443 9.69428C6.8411 10.0773 7.78497 11.0495 8.15716 12.2908L8.60744 13.793C8.67918 14.0335 9.01014 14.0335 9.08188 13.793L9.53217 12.2908C9.90434 11.0488 10.8489 10.0773 12.0549 9.69428L13.5144 9.23082C13.7481 9.15699 13.7481 8.81636 13.5144 8.74251L12.0549 8.27906C10.8482 7.89601 9.90436 6.92379 9.53217 5.68256L9.08188 4.18038C9.01015 3.93987 8.6799 3.93987 8.60744 4.18038ZM17.0158 13.2411L17.3425 14.3324C17.6131 15.2345 18.2992 15.9414 19.1756 16.2191L20.236 16.5554C20.4057 16.6095 20.4057 16.8566 20.236 16.9106L19.1756 17.2469C18.2992 17.5254 17.6124 18.2315 17.3425 19.1336L17.0158 20.225C16.9633 20.3997 16.7232 20.3997 16.6706 20.225L16.3439 19.1336C16.0733 18.2315 15.3873 17.5247 14.5108 17.2469L13.4505 16.9106C13.2807 16.8565 13.2807 16.6095 13.4505 16.5554L14.5108 16.2191C15.3873 15.9406 16.0741 15.2345 16.3439 14.3324L16.6706 13.2411C16.7232 13.0663 16.964 13.0663 17.0158 13.2411ZM7.36235 17.5912V16.676C7.36235 16.5429 7.46676 16.4355 7.59603 16.4355C7.72529 16.4355 7.8297 16.5429 7.8297 16.676V17.5912C7.8297 17.7242 7.7253 17.8317 7.59603 17.8317C7.46748 17.8317 7.36235 17.7235 7.36235 17.5912ZM7.36235 19.9764V19.0612C7.36235 18.9282 7.46676 18.8207 7.59603 18.8207C7.72529 18.8207 7.8297 18.9282 7.8297 19.0612V19.9764C7.8297 20.1094 7.7253 20.2169 7.59603 20.2169C7.46748 20.2169 7.36235 20.1095 7.36235 19.9764ZM8.07614 18.3258C8.07614 18.1928 8.18054 18.0853 8.30981 18.0853H9.19901C9.32827 18.0853 9.43268 18.1928 9.43268 18.3258C9.43268 18.4589 9.32828 18.5663 9.19901 18.5663H8.30981C8.18055 18.5663 8.07614 18.4589 8.07614 18.3258ZM5.75941 18.3258C5.75941 18.1928 5.86381 18.0853 5.99308 18.0853H6.88228C7.01154 18.0853 7.11596 18.1928 7.11596 18.3258C7.11596 18.4589 7.01155 18.5663 6.88228 18.5663H5.99308C5.86382 18.5663 5.75941 18.4589 5.75941 18.3258ZM17.998 6.91136V5.99616C17.998 5.86312 18.1024 5.75566 18.2316 5.75566C18.3609 5.75566 18.4653 5.86311 18.4653 5.99616V6.91136C18.4653 7.04441 18.3609 7.15187 18.2316 7.15187C18.1031 7.15187 17.998 7.04441 17.998 6.91136ZM17.998 9.29583V8.38063C17.998 8.24759 18.1024 8.14013 18.2316 8.14013C18.3609 8.14013 18.4653 8.24758 18.4653 8.38063V9.29583C18.4653 9.42887 18.3609 9.53634 18.2316 9.53634C18.1031 9.53707 17.998 9.42888 17.998 9.29583ZM18.7124 7.64598C18.7124 7.51294 18.8168 7.40547 18.9461 7.40547H19.8353C19.9646 7.40547 20.069 7.51293 20.069 7.64598C20.069 7.77903 19.9646 7.88648 19.8353 7.88648H18.9461C18.8169 7.88648 18.7124 7.77903 18.7124 7.64598ZM16.395 7.64598C16.395 7.51294 16.4994 7.40547 16.6287 7.40547H17.5179C17.6471 7.40547 17.7515 7.51293 17.7515 7.64598C17.7515 7.77903 17.6471 7.88648 17.5179 7.88648H16.6287C16.4994 7.88648 16.395 7.77903 16.395 7.64598Z" fill="#9245E5"/>
                      </svg>
                    </div>
                    生成中
                  </div>
                </>
              ) : (
                // 初始狀態
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
              )}
            </div>
          ) : (
            <>
              {Object.keys(platformResults).length > 0 ? (
                <div style={{ 
                  width: '100%',
                  height: '100%',
                  position: 'relative'
                }}>
                  {/* 生成結果標題 - 響應式定位 */}
                  <h1 
                    className="results-title"
                    style={{
                      fontFamily: 'Inter',
                      fontSize: 'clamp(24px, 3vw, 36px)', // 響應式字體大小
                      fontWeight: 600,
                      lineHeight: '1.21em',
                      color: '#000000',
                      margin: '0 0 24px 0',
                      width: '100%'
                    }}
                  >
                    生成結果
                  </h1>
                  
                  {/* 三個卡片容器 - 響應式網格布局 */}
                  <div 
                    className="results-grid"
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', // 響應式網格
                      gap: 'clamp(12px, 1.5vw, 24px)', // 響應式間距
                      width: '100%',
                      maxWidth: '100%',
                      overflow: 'hidden'
                    }}
                  >
                  {Object.entries(platformResults)
                    .filter(([platform]) => {
                      // 如果選擇了"全部"，顯示所有結果
                      if (selectedPlatforms.includes("全部")) {
                        return true;
                      }
                      // 否則只顯示選擇的平台
                      return selectedPlatforms.includes(platform);
                    })
                    .map(([platform, text]) => {
                    // 平台圖標和標籤映射
                    const platformConfig = {
                      'facebook': { 
                        icon: (
                          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M26.25 23.125C26.25 24.8513 24.8513 26.25 23.125 26.25H6.875C5.14938 26.25 3.75 24.8513 3.75 23.125V6.875C3.75 5.14875 5.14938 3.75 6.875 3.75H23.125C24.8513 3.75 26.25 5.14875 26.25 6.875V23.125Z" fill="#3F51B5"/>
                            <path d="M21.48 15.625H19.375V23.75H16.25V15.625H14.375V13.125H16.25V11.6188C16.2513 9.42625 17.1619 8.125 19.745 8.125H21.875V10.625H20.4456C19.44 10.625 19.375 11 19.375 11.7019V13.125H21.875L21.48 15.625Z" fill="white"/>
                          </svg>
                        ), 
                        label: 'facebook' 
                      },
                      'instagram': { 
                        icon: (
                          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21.261 26.2441L8.76102 26.256C6.01102 26.2585 3.75914 24.011 3.75602 21.261L3.74414 8.76102C3.74164 6.01102 5.98914 3.75914 8.73914 3.75602L21.2391 3.74414C23.9891 3.74164 26.241 5.98914 26.2441 8.73914L26.256 21.2391C26.2591 23.9898 24.011 26.2416 21.261 26.2441Z" fill="url(#paint0_radial_200_602)"/>
                            <path d="M21.261 26.2441L8.76102 26.256C6.01102 26.2585 3.75914 24.011 3.75602 21.261L3.74414 8.76102C3.74164 6.01102 5.98914 3.75914 8.73914 3.75602L21.2391 3.74414C23.9891 3.74164 26.241 5.98914 26.2441 8.73914L26.256 21.2391C26.2591 23.9898 24.011 26.2416 21.261 26.2441Z" fill="url(#paint1_radial_200_602)"/>
                            <path d="M15 19.375C12.5881 19.375 10.625 17.4125 10.625 15C10.625 12.5875 12.5881 10.625 15 10.625C17.4119 10.625 19.375 12.5875 19.375 15C19.375 17.4125 17.4119 19.375 15 19.375ZM15 11.875C13.2769 11.875 11.875 13.2769 11.875 15C11.875 16.7231 13.2769 18.125 15 18.125C16.7231 18.125 18.125 16.7231 18.125 15C18.125 13.2769 16.7231 11.875 15 11.875Z" fill="white"/>
                            <path d="M19.6875 11.25C20.2053 11.25 20.625 10.8303 20.625 10.3125C20.625 9.79473 20.2053 9.375 19.6875 9.375C19.1697 9.375 18.75 9.79473 18.75 10.3125C18.75 10.8303 19.1697 11.25 19.6875 11.25Z" fill="white"/>
                            <path d="M18.75 23.125H11.25C8.83813 23.125 6.875 21.1625 6.875 18.75V11.25C6.875 8.8375 8.83813 6.875 11.25 6.875H18.75C21.1619 6.875 23.125 8.8375 23.125 11.25V18.75C23.125 21.1625 21.1619 23.125 18.75 23.125ZM11.25 8.125C9.52688 8.125 8.125 9.52688 8.125 11.25V18.75C8.125 20.4731 9.52688 21.875 11.25 21.875H18.75C20.4731 21.875 21.875 20.4731 21.875 18.75V11.25C21.875 9.52688 20.4731 8.125 18.75 8.125H11.25Z" fill="white"/>
                            <defs>
                              <radialGradient id="paint0_radial_200_602" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12.1129 26.2723) scale(28.0619)">
                                <stop stopColor="#FFDD55"/>
                                <stop offset="0.328" stopColor="#FF543F"/>
                                <stop offset="0.348" stopColor="#FC5245"/>
                                <stop offset="0.504" stopColor="#E64771"/>
                                <stop offset="0.643" stopColor="#D53E91"/>
                                <stop offset="0.761" stopColor="#CC39A4"/>
                                <stop offset="0.841" stopColor="#C837AB"/>
                              </radialGradient>
                              <radialGradient id="paint1_radial_200_602" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(7.36664 3.46308) scale(18.6331 12.4153)">
                                <stop stopColor="#4168C9"/>
                                <stop offset="0.999" stopColor="#4168C9" stopOpacity="0"/>
                              </radialGradient>
                            </defs>
                          </svg>
                        ), 
                        label: 'instagram' 
                      },
                      '電商網站': { 
                        icon: (
                          <svg width="30" height="22" viewBox="0 0 30 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M28.734 3.85873C28.734 3.312 28.2889 2.86816 27.7406 2.86816H3.17111C2.62283 2.86816 2.17773 3.312 2.17773 3.85873V19.4436C2.17773 19.9903 2.62283 20.4342 3.17111 20.4342H27.7406C28.2889 20.4342 28.734 19.9903 28.734 19.4436V3.85873Z" fill="#CCE6FF" fillOpacity="0.258824"/>
                            <path fillRule="evenodd" clipRule="evenodd" d="M27.9391 2.8685C27.9391 2.32177 27.4939 1.87793 26.9457 1.87793H2.37619C1.82791 1.87793 1.38281 2.32177 1.38281 2.8685V18.4534C1.38281 19.0001 1.82791 19.444 2.37619 19.444H26.9457C27.4939 19.444 27.9391 19.0001 27.9391 18.4534V2.8685Z" fill="url(#paint0_linear_200_648)"/>
                            <path fillRule="evenodd" clipRule="evenodd" d="M26.482 5.04785H2.77344V17.529C2.77344 17.9299 3.09986 18.2554 3.50191 18.2554H25.9522C26.2446 18.2554 26.482 18.0187 26.482 17.7271V5.04785Z" fill="url(#paint1_linear_200_648)"/>
                            <path d="M4.82668 3.92477C5.11928 3.92477 5.35648 3.68824 5.35648 3.39647C5.35648 3.10469 5.11928 2.86816 4.82668 2.86816C4.53408 2.86816 4.29688 3.10469 4.29688 3.39647C4.29688 3.68824 4.53408 3.92477 4.82668 3.92477Z" fill="#0084FF"/>
                            <path d="M3.30324 3.92477C3.59584 3.92477 3.83304 3.68824 3.83304 3.39647C3.83304 3.10469 3.59584 2.86816 3.30324 2.86816C3.01064 2.86816 2.77344 3.10469 2.77344 3.39647C2.77344 3.68824 3.01064 3.92477 3.30324 3.92477Z" fill="#55D7FF"/>
                            <path d="M6.34914 3.92477C6.64174 3.92477 6.87894 3.68824 6.87894 3.39647C6.87894 3.10469 6.64174 2.86816 6.34914 2.86816C6.05654 2.86816 5.81934 3.10469 5.81934 3.39647C5.81934 3.68824 6.05654 3.92477 6.34914 3.92477Z" fill="#0BBC00"/>
                            <path fillRule="evenodd" clipRule="evenodd" d="M22.3097 3.39647C22.3097 3.10484 22.0723 2.86816 21.7799 2.86816H12.1773C11.8848 2.86816 11.6475 3.10484 11.6475 3.39647C11.6475 3.68802 11.8848 3.92477 12.1773 3.92477H21.7799C22.0723 3.92477 22.3097 3.68802 22.3097 3.39647Z" fill="#E5F1FF"/>
                            <path fillRule="evenodd" clipRule="evenodd" d="M26.4818 3.39647C26.4818 3.10484 26.2444 2.86816 25.952 2.86816H25.356C25.0635 2.86816 24.8262 3.10484 24.8262 3.39647C24.8262 3.68802 25.0635 3.92477 25.356 3.92477H25.952C26.2444 3.92477 26.4818 3.68802 26.4818 3.39647Z" fill="#E5F1FF"/>
                            <path fillRule="evenodd" clipRule="evenodd" d="M24.4291 3.39647C24.4291 3.10484 24.1916 2.86816 23.8993 2.86816H23.3032C23.0108 2.86816 22.7734 3.10484 22.7734 3.39647C22.7734 3.68802 23.0108 3.92477 23.3032 3.92477H23.8993C24.1916 3.92477 24.4291 3.68802 24.4291 3.39647Z" fill="#E5F1FF"/>
                            <defs>
                              <linearGradient id="paint0_linear_200_648" x1="2.27588" y1="10.3318" x2="2.27588" y2="27.2511" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#CCE6FF"/>
                                <stop offset="1" stopColor="#1D98FF"/>
                              </linearGradient>
                              <linearGradient id="paint1_linear_200_648" x1="8.96377" y1="6.24543" x2="8.96377" y2="26.3767" gradientUnits="userSpaceOnUse">
                                <stop stopColor="white"/>
                                <stop offset="1" stopColor="#D0E4FC"/>
                              </linearGradient>
                            </defs>
                          </svg>
                        ), 
                        label: '網站平台' 
                      }
                    };
                    
                    const config = platformConfig[platform as keyof typeof platformConfig] || { icon: '📝', label: platform };

                    return (
                      <div 
                        key={platform} 
                        className="result-card"
                        style={{ 
                          width: '100%',
                          maxWidth: '350px', // 最大寬度限制
                          minWidth: '280px', // 最小寬度保證
                          height: 'clamp(600px, 70vh, 750px)', // 響應式高度 - 增加高度
                          backgroundColor: '#FFFFFF',
                          border: '0.5px solid #CDCDDF',
                          borderRadius: '16px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          margin: '0 auto' // 卡片居中
                        }}
                      >
                        {/* 平台標題區域 */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'flex-start',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {typeof config.icon === 'string' ? (
                            <span style={{ fontSize: '16px' }}>{config.icon}</span>
                          ) : (
                            config.icon
                          )}
                          <span 
                            style={{
                              fontFamily: 'Inter',
                              fontSize: '16px',
                              fontWeight: 600,
                              lineHeight: '1.21em',
                              color: '#000000'
                            }}
                          >
                            {config.label}
                          </span>
                        </div>

                        {/* 文案內容區域 - 直接可編輯 */}
                        <textarea
                          value={editingTexts[platform] !== undefined ? editingTexts[platform] : text}
                          onChange={(e) => {
                            handleEditTextChange(platform, e.target.value);
                            // 即時更新文案內容
                            setPlatformResults(prev => ({ ...prev, [platform]: e.target.value }));
                            
                            // 如果是第一個平台結果，也更新向後兼容的狀態
                            if (Object.keys(platformResults).indexOf(platform) === 0) {
                              setOriginalCopy(e.target.value);
                              setDisplayCopy(e.target.value);
                            }
                          }}
                          style={{
                            flex: 1,
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: '6px',
                            padding: '10px',
                            fontFamily: 'Inter',
                            fontSize: 'clamp(16px, 1.2vw, 18px)', // 改為 16px 起始以防止手機瀏覽器自動放大
                            fontWeight: 400,
                            lineHeight: '1.6',
                            color: '#374151',
                            resize: 'none',
                            outline: 'none',
                            wordBreak: 'break-word',
                            transition: 'border-color 0.2s ease'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#9245E5';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#E5E7EB';
                          }}
                          placeholder="您的文案將顯示在這裡，可以直接編輯..."
                        />

                        {/* 按鈕區域 - 簡化版 */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'flex-end',
                          justifyContent: 'stretch'
                        }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyText(platform, editingTexts[platform] !== undefined ? editingTexts[platform] : text)}
                            onMouseEnter={() => handleCopyButtonMouseEnter(platform)}
                            onMouseLeave={() => handleCopyButtonMouseLeave(platform)}
                            style={{
                              backgroundColor: copyButtonHover[platform] ? '#9245E5' : '#EDE6F8',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: copyButtonHover[platform] ? '#9245E5' : '#EDE6F8',
                              borderRadius: '6px',
                              padding: '8px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontSize: '14px',
                              fontWeight: 500,
                              color: copyButtonHover[platform] ? '#FFFFFF' : '#9245E5',
                              cursor: 'pointer',
                              width: '100%',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill={copyButtonHover[platform] ? '#FFFFFF' : '#9245E5'}/>
                            </svg>
                            <span style={{
                              opacity: 1,
                              transition: 'opacity 1s ease',
                              minWidth: '60px',
                              display: 'inline-block',
                              textAlign: 'center'
                            }}>
                              {copiedStates[platform] ? '已複製' : '複製文案'}
                            </span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              ) : output && (
                  <div 
                    style={{ 
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    {/* 只在錯誤訊息時顯示 GIF */}
                    {output && output.includes('無法辨識圖片中的產品名稱或賣點') && (
                      <img 
                        src="/cant-see-error.gif" 
                        alt="無法識別"
                        style={{
                          width: '200px',
                          height: 'auto',
                          borderRadius: '8px'
                        }}
                      />
                    )}
                    <div 
                      style={{
                        fontFamily: 'Inter',
                        fontSize: '15px',
                        fontWeight: 400,
                        lineHeight: '1.6',
                        color: '#374151',
                        whiteSpace: 'pre-wrap',
                        textAlign: 'center'
                      }}
                    >
                      {output}
                    </div>
                  </div>
                )}
              </>
            )}
        </div>
      </div>
      
      {/* Footer Copyright */}
      <footer 
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          backgroundColor: 'rgba(139, 139, 139, 0.4)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          padding: '10px 16px',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <p 
          style={{
            fontFamily: 'Inter',
            fontSize: '13px',
            fontWeight: 500,
            lineHeight: '1.2',
            color: '#FFFFFF',
            margin: '0',
            letterSpacing: '0.2px',
            whiteSpace: 'nowrap',
            textAlign: 'center'
          }}
        >
          version 1.0｜Built with grit and magic by the Tinker Crew from BZ
        </p>
      </footer>
    </div>
  )
}