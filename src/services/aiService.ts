export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  isLineValid: boolean;
}

export interface ReceiptAnalysis {
  merchantName: string;
  date: string;
  totalAmount: number;
  items: ReceiptItem[];
  isCorrect: boolean;
  analysisNote: string;
}

export const analyzeReceipt = async (base64Image: string, historicalContext?: string[]): Promise<ReceiptAnalysis> => {
  try {
    const response = await fetch(`/api/receipt-analyze?t=${Date.now()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        image: base64Image,
        historicalDescriptions: historicalContext // Pass historical product names
      }),
    });

    let responseText = await response.text();
    if (!response.ok) {
      let errorMessage = "การวิเคราะห์ล้มเหลว";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = `เซิร์ฟเวอร์ตอบกลับผิดพลาด: HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    try {
      const result = JSON.parse(responseText);
      return result as ReceiptAnalysis;
    } catch (e) {
      console.error("Failed to parse success response:", responseText);
      if (responseText.includes("<!doctype html>") || responseText.includes("<html")) {
        throw new Error("เซิร์ฟเวอร์ตอบกลับเป็นหน้าเว็บ (HTML) แทนที่จะเป็นข้อมูลการวิเคราะห์ โปรดลองรอสักครู่แล้วลองอีกครั้ง หรือตรวจสอบการเชื่อมต่อ");
      }
      throw new Error(`รูปแบบข้อมูลที่ได้รับไม่ถูกต้อง (JSON parse error). ตัวอย่างข้อมูล: ${responseText.substring(0, 100)}`);
    }
  } catch (error) {
    console.error("Analysis service error:", error);
    throw error;
  }
};

/**
 * Text-to-Speech using Web Speech API (Free and fast)
 */
export const speakText = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("Web Speech API not supported in this browser.");
  }
};
