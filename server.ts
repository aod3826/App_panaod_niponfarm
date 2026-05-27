import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import https from "https";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Log API requests for debugging
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
  });

  app.get("/api/health", (req, res) => {
    const apiKey = process.env.CENTRAL_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    res.json({ 
      status: "ok",
      aiKeyReady: !!apiKey
    });
  });

  app.get("/api/weather", async (req, res) => {
    try {
      const { latitude, longitude } = req.query;
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Missing latitude or longitude" });
      }

      // Check environment variables
      const apiKey = "206eb2bbcb1c53a523a64a3a25b0ddf5"; // User provided API Key
      
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=th`;
      
      const data = await new Promise((resolve, reject) => {
        https.get(url, {
          headers: {
            'User-Agent': 'NiponFarm/1.0',
            'Connection': 'close'
          }
        }, (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            if (res.statusCode !== 200) {
              reject(new Error(`Weather API Status: ${res.statusCode} ${body}`));
              return;
            }
            try {
              resolve(JSON.parse(body));
            } catch(e) {
              reject(e);
            }
          });
        }).on('error', (err) => {
          reject(err);
        });
      });

      res.json(data);
    } catch (error: any) {
      console.warn(`[Weather Service] Warning: OpenWeatherMap failed, using fallback. (${error.message})`);
      res.json({
        fallback: true,
        weather: [{ description: "เมฆครึ้ม", main: "Clouds", icon: "04d" }],
        main: { temp: 28, humidity: 75 },
        wind: { speed: 3.5 },
        visibility: 10000
      });
    }
  });

  app.post("/api/receipt-analyze", async (req, res) => {
    console.log("-> Starting receipt analysis handler");
    try {
      const { image, historicalDescriptions } = req.body;
      
      if (!image) {
        console.error("API Error: No image data provided in request body");
        return res.status(400).json({ error: "ไม่พบข้อมูลรูปภาพในคำขอ" });
      }

      const apiKey = process.env.CENTRAL_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.error("Server Error: No Gemini API Key defined in environment variables (checked CENTRAL_GEMINI_API_KEY and GEMINI_API_KEY)");
        return res.status(500).json({ error: "เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า API Key (โปรดตั้งค่า CENTRAL_GEMINI_API_KEY ใน Settings > Secrets)" });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      const model = "gemini-3-flash-preview";

      // Strip potential data URL prefix from base64 string
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const historicalContextString = historicalDescriptions && historicalDescriptions.length > 0
        ? `\n\nHISTORICAL PRODUCT NAMES (LEARNED CONTEXT):\nThese are product names from previous bills. If you find matching or similar names, prefer these exact strings for better consistency: ${historicalDescriptions.join(', ')}.`
        : '';

      const prompt = `Analyze this handwriting or printed image of a "Delivery Bill" (ใบส่งของ). 
  This is a payment receipt for a pig farm purchasing raw materials.
  
  1. EXTRACT METADATA:
     - merchantName: Found at the top header or in a stamp.
     - date: Usually at the top right (e.g., 30/3/69 means 30 March 2569).
     - totalAmount: The final TOTAL (รวมเงิน) found at the bottom right.
  
  2. EXTRACT TABLE ITEMS (Look for these columns from left to right):
     - quantity (จำนวน): Number of items.
     - description (รายการ): Name of product (e.g., อาหารหมู P-221, รำละเอียด, ปลายข้าว).
     - unitPrice (หน่วยละ): Price per one unit.
     - amount (จำนวนเงิน): Total for that row.
  
  3. HISTORICAL CONTEXT:${historicalContextString}
  
  4. MATHEMATICAL CROSS-CHECK (AUDIT):
     - For EACH line: verify if (quantity * unitPrice) equals the "amount" written on the bill.
     - If it does NOT match, set isLineValid to false.
     - Verify if Sum(amounts) matches the totalAmount.
  
  5. Provide an "analysisNote" in Thai. If the merchant wrote the wrong math, flag it clearly.
  6. Return valid JSON only.`;

      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      };

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              merchantName: { type: Type.STRING },
              date: { type: Type.STRING },
              totalAmount: { type: Type.NUMBER },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitPrice: { type: Type.NUMBER },
                    amount: { type: Type.NUMBER },
                    isLineValid: { type: Type.BOOLEAN }
                  }
                }
              },
              isCorrect: { type: Type.BOOLEAN },
              analysisNote: { type: Type.STRING }
            },
            required: ["merchantName", "totalAmount", "isCorrect", "analysisNote", "items"]
          }
        }
      });

      let resultText = response.text || "{}";
      
      // Clean up potential markdown formatting from Gemini
      resultText = resultText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

      let result;
      try {
        result = JSON.parse(resultText);
      } catch (parseError) {
        console.error("JSON Parse Error. Raw response:", resultText);
        return res.status(500).json({ error: "รูปแบบข้อมูลที่ตอบกลับจาก AI ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Server Analysis Error:", error);
      
      let friendlyError = "การวิเคราะห์ล้มเหลว โปรดตรวจสอบว่าบิลภาพชัดเจนหรือไม่";
      const errorStr = String(error?.message || error);
      
      if (errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("depleted")) {
        friendlyError = "API Key ที่ใช้งานหมดโควต้า/เครดิต (Quota Exceeded) โปรดเปลี่ยน API Key ใหม่ หรือเติมเงินใน Google AI Studio";
      } else if (errorStr.includes("API_KEY_INVALID")) {
        friendlyError = "API Key ไม่ถูกต้อง โปรดตรวจสอบ API Key ในช่อง Settings > Secrets อีกครั้ง";
      }

      res.status(500).json({ error: friendlyError, details: errorStr });
    }
  });

  // Catch-all for other API routes to prevent them falling through to SPA fallback
  app.all("/api/*", (req, res) => {
    console.warn(`404: API route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.url}` });
  });

  // Express Error Handler for JSON parsing and payload limits
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      console.error("Express Error:", err);
      res.status(err.status || 500).json({ error: "Server Error", details: err.message });
    } else {
      next();
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Server failed to start:", err);
});
