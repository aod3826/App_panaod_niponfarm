import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, RefreshCw, Volume2, ArrowLeft, CheckCircle2, XCircle, Loader2, Save, History, Edit3, Trash2, PlusCircle, AlertTriangle, Zap, ZapOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeReceipt, ReceiptAnalysis, speakText, ReceiptItem } from '../services/aiService';
import imageCompression from 'browser-image-compression';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import { saveScannedBill, getHistoricalItemDescriptions } from '../services/billService';
// import { subscribeMasterIngredients, MasterIngredient } from '../services/ingredientService';

export default function ScanReceipt() {
  const navigate = useNavigate();
  const { showAlert } = useBottomSheet();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<ReceiptAnalysis | null>(null);

  // Simulated progress during analysis
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      setAnalysisProgress(0);
      interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev < 30) return prev + 2; // Fast start
          if (prev < 60) return prev + 1; // Normal speed
          if (prev < 90) return prev + 0.5; // Slow down
          if (prev < 98) return prev + 0.1; // Very slow near the end
          return prev;
        });
      }, 100);
    } else {
      setAnalysisProgress(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);
  const [editableItems, setEditableItems] = useState<ReceiptItem[]>([]);
  const [manualMerchantName, setManualMerchantName] = useState('');
  const [manualTotal, setManualTotal] = useState<number>(0);
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'no-key' | 'error'>('checking');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isFlashSupported, setIsFlashSupported] = useState(false);
  const [historicalDescriptions, setHistoricalDescriptions] = useState<string[]>([]);

  // Auto-Capture States
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [stabilityScore, setStabilityScore] = useState(0); 
  const [isDocumentDetected, setIsDocumentDetected] = useState(false);
  const [flashPhase, setFlashPhase] = useState<'none' | 'flash1' | 'flash2'>('none');
  const [cameraWarmup, setCameraWarmup] = useState(0); // Delay detection after open
  
  const lastFrameRef = useRef<ImageData | null>(null);
  const motionDetectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isCapturingRef = useRef(false);

  useEffect(() => {
    if (isCameraActive) {
      const timer = setTimeout(() => setCameraWarmup(100), 400); // Faster warm up
      return () => {
        clearTimeout(timer);
        setCameraWarmup(0);
      };
    }
  }, [isCameraActive]);

  useEffect(() => {
    // Create a hidden canvas for motion detection if not exists
    if (!motionDetectionCanvasRef.current) {
      motionDetectionCanvasRef.current = document.createElement('canvas');
      motionDetectionCanvasRef.current.width = 64; 
      motionDetectionCanvasRef.current.height = 64;
    }
  }, []);

  // Motion Detection Loop
  useEffect(() => {
    let animationFrameId: number;

    const detectMotionAndDocument = () => {
      // Don't detect if camera off, auto mode off, already analyzing/captured, or editing, or warming up
      if (!isCameraActive || !isAutoMode || analysisResult || isCapturingRef.current || isAnalyzing || cameraWarmup < 100) {
        setStabilityScore(0);
        setIsDocumentDetected(false);
        animationFrameId = requestAnimationFrame(detectMotionAndDocument);
        return;
      }

      const video = videoRef.current;
      const canvas = motionDetectionCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animationFrameId = requestAnimationFrame(detectMotionAndDocument);
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Draw current video frame to small canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (lastFrameRef.current) {
        let diff = 0;
        const data1 = currentFrame.data;
        const data2 = lastFrameRef.current.data;

        // Compare pixels (every 16th for speed)
        for (let i = 0; i < data1.length; i += 16) {
          diff += Math.abs(data1[i] - data2[i]); 
        }

        const motionLevel = diff / (canvas.width * canvas.height);
        
        // Motion thresholds (Stillness)
        const STILL_THRESHOLD = 20; 
        
        if (motionLevel < STILL_THRESHOLD) { 
          // Slower increment for longer stabilization (approx 3-4 seconds at 30-60fps)
          setStabilityScore(prev => Math.min(prev + 0.8, 100)); 
          setIsDocumentDetected(true); // Treat as "found" just to show the UI feedback
        } else {
          // Significant motion resets the score
          setStabilityScore(prev => Math.max(0, prev - 15));
          setIsDocumentDetected(false);
        }
      }

      lastFrameRef.current = currentFrame;
      animationFrameId = requestAnimationFrame(detectMotionAndDocument);
    };

    if (isCameraActive && isAutoMode) {
      animationFrameId = requestAnimationFrame(detectMotionAndDocument);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isCameraActive, isAutoMode, analysisResult, isAnalyzing, cameraWarmup]);

  // Handle Stability reaching 100% with Double Flash Sequence
  useEffect(() => {
    if (stabilityScore === 100 && !isCapturingRef.current && !analysisResult && !isAnalyzing) {
      isCapturingRef.current = true;
      
      const triggerFlashSequence = async () => {
        // Flash 1
        setFlashPhase('flash1');
        await new Promise(r => setTimeout(r, 150));
        setFlashPhase('none');
        await new Promise(r => setTimeout(r, 150));
        
        // Flash 2
        setFlashPhase('flash2');
        await new Promise(r => setTimeout(r, 150));
        setFlashPhase('none');
        
        // Final Capture
        capture();
        
        // Reset isCapturingRef after some time
        setTimeout(() => {
          isCapturingRef.current = false;
          setStabilityScore(0);
        }, 5000);
      };

      triggerFlashSequence();
    }
  }, [stabilityScore, analysisResult, isAnalyzing]);

  useEffect(() => {
    const fetchHistorical = async () => {
      const data = await getHistoricalItemDescriptions();
      setHistoricalDescriptions(data);
    };
    fetchHistorical();
  }, []);

  useEffect(() => {
    checkServerStatus();
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const checkServerStatus = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        if (data.aiKeyReady) {
          setServerStatus('connected');
        } else {
          setServerStatus('no-key');
        }
      } else {
        setServerStatus('error');
      }
    } catch (err) {
      setServerStatus('error');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);

        // Check if flash is supported
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities && capabilities.torch) {
          setIsFlashSupported(true);
        } else {
          setIsFlashSupported(false);
        }

        // Try to enable continuous autofocus if available
        if (capabilities && capabilities.focusMode) {
          try {
             await track.applyConstraints({
               advanced: [{ focusMode: 'continuous' }] as any
             });
          } catch(e) {}
        }
      }
    } catch (err) {
      console.error("Camera error:", err);
      showAlert("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบการอนุญาต");
    }
  };

  const toggleFlash = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    
    try {
      const newFlashStatus = !isFlashOn;
      await track.applyConstraints({
        advanced: [{ torch: newFlashStatus }] as any
      });
      setIsFlashOn(newFlashStatus);
    } catch (err) {
      console.error("Flash toggle error:", err);
      showAlert("ไม่สามารถควบคุมไฟฉายของอุปกรณ์ได้");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        // Try to turn off torch before stopping track
        try {
          track.applyConstraints({ advanced: [{ torch: false }] as any });
        } catch (e) {}
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsFlashOn(false);
  };

  const capture = () => {
    // Already capturing, skip
    if (isCapturingRef.current && isAnalyzing) return;
    
    isCapturingRef.current = true;
    
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Capture full resolution from video
      const width = video.videoWidth;
      const height = video.videoHeight;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          
          try {
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1024,
              useWebWorker: true,
            };
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            const compressedBlob = await imageCompression(file, options);
            
            const reader = new FileReader();
            reader.readAsDataURL(compressedBlob);
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              console.log(`Base64 payload length: ${Math.round(dataUrl.length / 1024)} KB`);
              setCapturedImage(dataUrl);
              stopCamera();
              handleAnalysis(dataUrl);
            };
          } catch (error) {
            console.error('Image compression failed:', error);
            // Fallback to basic canvas compression
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            setCapturedImage(dataUrl);
            stopCamera();
            handleAnalysis(dataUrl);
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleAnalysis = async (imageData: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setEditableItems([]);
    try {
      // Remove data:image/jpeg;base64, prefix
      const base64 = imageData.split(',')[1];
      const result = await analyzeReceipt(base64, historicalDescriptions);
      setAnalysisResult(result);
      setEditableItems(result.items.map(item => {
        const calculated = item.quantity * item.unitPrice;
        return {
          ...item,
          isLineValid: Math.abs(calculated - item.amount) < 1.0 // Allow for small rounding/scan errors
        };
      }));
      setManualMerchantName(result.merchantName);
      setManualTotal(result.totalAmount);
      
      // Auto-speak summary
      if (result) {
        const status = result.isCorrect ? "ยอดรวมถูกต้อง" : "ยอดรวมอาจจะไม่ถูกต้อง โปรดตรวจสอบ";
        const text = `สแกนใบเสร็จจาก ${result.merchantName} ยอดรวม ${result.totalAmount} บาท ${status}`;
        speakText(text);
      }
    } catch (err: any) {
      console.error(err);
      showAlert(`การวิเคราะห์ล้มเหลว: ${err.message || "โปรดลองอีกครั้ง"}`);
    } finally {
      setIsAnalyzing(false);
      // Reset capture flag so user can retry or take next photo
      setTimeout(() => {
        isCapturingRef.current = false;
      }, 1000);
    }
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: any) => {
    const newItems = [...editableItems];
    const item = { ...newItems[index], [field]: value };
    
    // Auto cross-check
    const calculated = item.quantity * item.unitPrice;
    if (field === 'quantity' || field === 'unitPrice') {
      // If user is editing the multipliers, we assume they want to update the amount
      // but they might also want to KEEP the amount to see the discrepancy.
      // However, usually they want the total to be correct.
      // Let's update amount but maybe keep a flag if they want strict manual amount?
      // Actually, standard behavior: update amount automatically.
      item.amount = calculated;
      item.isLineValid = true;
    } else if (field === 'amount') {
      item.isLineValid = Math.abs(calculated - item.amount) < 1.0;
    }
    
    newItems[index] = item;
    setEditableItems(newItems);

    // If description changed, check historical context
    if (field === 'description' && value.length > 2) {
      const normalizedInput = value.toLowerCase().replace(/\s+/g, '');
      const match = historicalDescriptions.find(name => 
        normalizedInput.includes(name.toLowerCase().replace(/\s+/g, '')) ||
        name.toLowerCase().replace(/\s+/g, '').includes(normalizedInput)
      );
      
      if (match && match !== value) {
        console.log(`Suggested match from history: ${match} for input ${value}`);
      }
    }
  };

  const addItem = () => {
    setEditableItems([...editableItems, { description: 'รายการใหม่', quantity: 1, unitPrice: 0, amount: 0, isLineValid: true }]);
  };

  const removeItem = (index: number) => {
    setEditableItems(editableItems.filter((_, i) => i !== index));
  };

  const calculatedTotal = editableItems.reduce((sum, item) => sum + item.amount, 0);
  const isTotalMatching = Math.abs(calculatedTotal - manualTotal) < 0.1;

  const handleSave = async () => {
    if (!analysisResult || !capturedImage) return;
    
    setIsSaving(true);
    try {
      const finalResult: ReceiptAnalysis = {
        ...analysisResult,
        merchantName: manualMerchantName,
        totalAmount: manualTotal,
        items: editableItems,
        isCorrect: isTotalMatching
      };
      await saveScannedBill(finalResult, capturedImage);
      showAlert("บันทึกข้อมูลบิลและรายการสินค้าเรียบร้อยแล้ว");
      reset();
    } catch (err: any) {
      console.error(err);
      showAlert(`บันทึกล้มเหลว: ${err.message || "โปรดลองอีกครั้ง"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    startCamera();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white pb-20 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sticky top-0 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-md z-10 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black tracking-tight">สแกนบิลรายจ่ายวัตถุดิบ</h1>
        </div>

        <div className="flex items-center gap-3">
          {isCameraActive && !capturedImage && (
            <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-full p-1 border border-slate-200 dark:border-white/10">
              <button 
                onClick={() => setIsAutoMode(true)}
                className={`px-3 py-1 text-[10px] font-black rounded-full transition-all ${isAutoMode ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`}
              >
                AUTO
              </button>
              <button 
                onClick={() => setIsAutoMode(false)}
                className={`px-3 py-1 text-[10px] font-black rounded-full transition-all ${!isAutoMode ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400'}`}
              >
                MANUAL
              </button>
            </div>
          )}
          
          <button 
            onClick={() => navigate('/scan/history')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-600 dark:text-white/70"
          >
            <History className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 text-xs font-bold shadow-sm">
            {serverStatus === 'checking' && <><Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> <span className="text-amber-600 dark:text-amber-400">กำลังเชื่อมต่อ...</span></>}
            {serverStatus === 'connected' && <><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse border border-emerald-300" /> <span className="text-emerald-600 dark:text-emerald-400">AI พร้อมตรวจบิล</span></>}
            {serverStatus === 'no-key' && <><XCircle className="w-4 h-4 text-rose-500" /> <span className="text-rose-600 dark:text-rose-400">ขาด API Key</span></>}
            {serverStatus === 'error' && <><XCircle className="w-4 h-4 text-rose-500" /> <span className="text-rose-600 dark:text-rose-400">เชื่อมต่อล้มเหลว</span></>}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-6">
        {/* Viewport Area */}
        <div className="relative aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800">
          {!capturedImage ? (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              
              {/* Flash Toggle Button */}
              {isFlashSupported && (
                <button
                  onClick={toggleFlash}
                  className={`absolute top-4 right-4 z-20 p-3 rounded-full transition-all border shadow-lg ${
                    isFlashOn 
                      ? 'bg-amber-400 text-slate-900 border-amber-500 scale-110' 
                      : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
                  }`}
                >
                  {isFlashOn ? <Zap className="w-6 h-6 fill-current" /> : <ZapOff className="w-6 h-6" />}
                </button>
              )}

              {/* Auto-Capture Stability Indicator */}
              {isAutoMode && isCameraActive && !analysisResult && (
                <div className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isDocumentDetected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                      {cameraWarmup < 100 ? 'กำลังเตรียมกล้อง...' :
                       !isDocumentDetected ? 'ถือกล้องให้นิ่งเพื่อบันทึก' :
                       stabilityScore < 100 ? 'กำลังโฟกัส... ถือให้นิ่ง' : 'ตรวจพบบิลแล้ว!'}
                    </span>
                  </div>
                  {isDocumentDetected && (
                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${stabilityScore}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="absolute inset-0 pointer-events-none border-[30px] border-black/40 flex items-center justify-center">
                <div className="w-[80%] h-[70%] border-2 border-dashed border-white/50 rounded-xl relative">
                   <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 -m-[4px]" />
                   <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 -m-[4px]" />
                   <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 -m-[4px]" />
                   <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 -m-[4px]" />
                </div>
              </div>

              {/* Visual Flash Effect */}
              <AnimatePresence>
                {flashPhase !== 'none' && (
                   <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-white/80 pointer-events-none"
                   />
                )}
              </AnimatePresence>
            </>
          ) : (
            <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
          )}

          {/* Analysis Overlay */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="relative mb-8">
                  <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black text-white">{Math.round(analysisProgress)}%</span>
                  </div>
                </div>

                <h2 className="text-2xl font-black text-white mb-2 leading-tight">
                  {analysisProgress < 30 ? 'กำลังอ่านข้อมูลบิล...' : 
                   analysisProgress < 60 ? 'กำลังแยกรายการสินค้า...' : 
                   analysisProgress < 90 ? 'กำลังตรวจสอบความถูกต้อง...' : 
                   'กำลังสรุปข้อมูลรายจ่าย...'}
                </h2>
                <p className="text-slate-300 text-sm mb-8 max-w-[280px]">
                  AI กำลังประมวลผลบิลของคุณอย่างละเอียด โปรดรอสักครู่...
                </p>

                {/* Linear Progress Bar */}
                <div className="w-full max-w-[260px] h-3 bg-white/10 rounded-full overflow-hidden border border-white/5 shadow-inner">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${analysisProgress}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                  >
                    <div className="w-full h-full relative overflow-hidden">
                       <motion.div 
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="absolute top-0 bottom-0 w-20 bg-white/30 skew-x-12"
                       />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Button */}
        <div className="flex justify-center -mt-12 relative z-20">
          {!capturedImage ? (
            <button 
              onClick={capture}
              disabled={!isCameraActive}
              className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/40 border-4 border-white dark:border-slate-800 active:scale-95 transition-transform disabled:opacity-50"
            >
              <Camera className="w-10 h-10 text-white" />
            </button>
          ) : !isAnalyzing && (
            <button 
              onClick={reset}
              className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center shadow-xl shadow-slate-800/40 border-4 border-white dark:border-slate-700 active:scale-95 transition-transform"
            >
              <RefreshCw className="w-10 h-10 text-white" />
            </button>
          )}
        </div>

        {/* Results Area */}
        <AnimatePresence>
          {analysisResult && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white dark:bg-[#1a2f3a] rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-white/10 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 mr-4">
                  {isEditing ? (
                    <input 
                      value={manualMerchantName}
                      onChange={(e) => setManualMerchantName(e.target.value)}
                      className="text-xl font-black bg-slate-100 dark:bg-white/10 rounded-lg px-2 py-1 w-full outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                      {manualMerchantName}
                    </h3>
                  )}
                  <p className="text-sm text-slate-500 dark:text-white/50">{analysisResult.date}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isTotalMatching ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                    {isTotalMatching ? <CheckCircle2 className="w-3.5 h-3.5"/> : <AlertTriangle className="w-3.5 h-3.5"/>}
                    {isTotalMatching ? 'คณิตศาสตร์แม่นยำ' : 'ยอดรวมไม่ตรง'}
                  </div>
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="py-4 border-y border-slate-100 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">รายการสินค้า</span>
                  {isEditing && (
                    <button onClick={addItem} className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1">
                      <PlusCircle className="w-3 h-3" /> เพิ่มรายการ
                    </button>
                  )}
                </div>

                {editableItems.map((item, idx) => (
                  <motion.div 
                    layout
                    key={idx} 
                    className={`p-4 rounded-2xl border transition-all ${
                      item.isLineValid 
                        ? 'bg-slate-50/50 dark:bg-white/5 border-slate-100 dark:border-white/5' 
                        : 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/50 ring-1 ring-rose-500/20'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">ชื่อรายการ</p>
                            <input 
                              value={item.description}
                              onChange={(e) => updateItem(idx, 'description', e.target.value)}
                              className="w-full bg-white dark:bg-black/20 rounded-lg px-2 py-1.5 text-sm outline-none border border-slate-200 dark:border-white/10"
                            />
                          </div>
                          <button onClick={() => removeItem(idx)} className="text-rose-500 p-1 mt-5">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">จำนวน</p>
                            <input 
                              type="number"
                              value={item.quantity}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                              className="w-full bg-white dark:bg-black/20 rounded-lg px-2 py-1.5 outline-none border border-slate-200 dark:border-white/10"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">ราคา/หน่วย</p>
                            <input 
                              type="number"
                              value={item.unitPrice}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateItem(idx, 'unitPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                              className="w-full bg-white dark:bg-black/20 rounded-lg px-2 py-1.5 outline-none border border-slate-200 dark:border-white/10"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">ยอดเงินแถว</p>
                            <input 
                              type="number"
                              value={item.amount}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateItem(idx, 'amount', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                              className={`w-full dark:bg-black/20 rounded-lg px-2 py-1.5 font-bold outline-none border ${item.isLineValid ? 'bg-white border-slate-200 dark:border-white/10' : 'bg-rose-50 border-rose-300 text-rose-600'}`}
                            />
                          </div>
                        </div>
                        {!item.isLineValid && (
                          <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                            <p className="text-[10px] text-rose-500 font-bold">
                              ⚠️ ยอดเงินในบิล (฿{item.amount.toLocaleString()}) ไม่ตรงกับผลคูณ (฿{(item.quantity * item.unitPrice).toLocaleString()})
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-slate-700 dark:text-white/80 font-bold flex-1 text-sm">{item.description}</span>
                          <div className="text-right">
                             <div className={`font-black text-sm ${item.isLineValid ? 'text-slate-900 dark:text-white' : 'text-rose-500'}`}>
                               ฿{item.amount.toLocaleString()}
                             </div>
                             {!item.isLineValid && (
                               <div className="text-[9px] text-rose-400 font-black line-through">
                                 ควรเป็น: ฿{(item.quantity * item.unitPrice).toLocaleString()}
                               </div>
                             )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 rounded-lg px-3 py-1.5">
                           <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-slate-500 dark:text-white/40">{item.quantity}</span>
                              <span className="text-[10px] text-slate-300">×</span>
                              <span className="text-[10px] font-black text-slate-500 dark:text-white/40">฿{item.unitPrice.toLocaleString()}</span>
                           </div>
                           
                           {item.isLineValid ? (
                              <div className="flex items-center gap-1 text-emerald-500">
                                 <CheckCircle2 className="w-3 h-3" />
                                 <span className="text-[9px] font-black uppercase tracking-widest">คณิตศาสตร์ถูกต้อง</span>
                              </div>
                           ) : (
                              <div className="flex items-center gap-1 text-rose-500 animate-pulse">
                                 <AlertTriangle className="w-3 h-3" />
                                 <span className="text-[9px] font-black uppercase tracking-widest text-wrap max-w-[80px] leading-tight">ตรวจสอบราคา! ร้านอาจคิดเงินผิด</span>
                              </div>
                           )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">ผลรวมคำนวณจริง</span>
                      <span className="font-black text-slate-900 dark:text-white">฿{calculatedTotal.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">ยอดสุทธิที่เรียกเก็บ</p>
                      {isEditing ? (
                        <input 
                          type="number"
                          value={manualTotal}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setManualTotal(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          className="bg-slate-100 dark:bg-white/10 rounded-lg px-2 py-1 text-2xl font-black w-32 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      ) : (
                        <span className="font-bold text-slate-900 dark:text-white">ยอดจากบิล</span>
                      )}
                    </div>
                    {!isEditing && (
                      <span className={`text-4xl font-black drop-shadow-sm transition-colors ${isTotalMatching ? 'text-emerald-500' : 'text-rose-500'}`}>
                        ฿{manualTotal.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {!isTotalMatching && !isEditing && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-500/30 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                        ยอดรวมจากทุกแถว (฿{calculatedTotal.toLocaleString()}) ไม่ตรงกับยอดสุทธิที่ระบุในบิล (฿{manualTotal.toLocaleString()}) โปรดตรวจสอบและแก้ไข
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>

              {analysisResult.analysisNote && (
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] text-slate-400 dark:text-white/30 uppercase font-black mb-1">AI Note</p>
                  <p className="text-xs italic text-slate-600 dark:text-white/60 leading-relaxed font-medium">
                    "{analysisResult.analysisNote}"
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => speakText(`ยอดรวม ${manualTotal} บาท`)}
                  className="p-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                >
                  <Volume2 className="w-5 h-5"/>
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex-1 py-4 font-black rounded-3xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-lg ${
                    isTotalMatching 
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-slate-900/10 dark:shadow-white/10' 
                      : 'bg-rose-600 text-white shadow-rose-600/20'
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5"/>
                  )}
                  {isSaving ? "กำลังบันทึก..." : isTotalMatching ? "บันทึกข้อมูล" : "ขืนบันทึก (ยอดไม่ตรง)"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}
