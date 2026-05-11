import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface WaterAnalysisResult {
  contaminationLevel: 'safe' | 'moderate' | 'unsafe';
  waterType: 'potable' | 'environmental' | 'industrial' | 'unknown';
  confidence: number;
  detections: string[];
  healthRisk: string;
  recommendation: string;
  explanation: string;
}

export async function analyzeWaterQuality(base64Image: string): Promise<WaterAnalysisResult> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze this image of a water sample. 
  Step 1: Identify the likely water source type:
  - Potable: Drinking water sources, clear taps, bottled.
  - Environmental: Rivers, lakes, ponds, stagnant pools (look for algae, earth tones).
  - Industrial: Wastewater from factories, runoff (look for chemical dyes, oil slicks, synthetic foam).

  Step 2: Classify its contamination level based on visual indicators:
  - 🟢 Safe: Clear, no particles, no discoloration, no algae. (Mostly for potable)
  - 🟡 Moderate: Slight discoloration, minor particles/sediment, low algae density.
  - 🔴 Unsafe: Dark/cloudy, heavy debris, oil sheen, chemical colors (black/purple/dark blue), dense industrial foam, or heavy algae.

  Parameters to check:
  - Turbidity & Sediment: Clarity vs particulate matter.
  - Coloration: Natural vs chemical dye/pollution hues.
  - Surface Contaminants: Oil films, industrial detergents (foam), floating plastics.
  - Biological Load: Algae blooms, rot, or visible organisms.

  Return the result in JSON format.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          contaminationLevel: { type: Type.STRING, enum: ['safe', 'moderate', 'unsafe'] },
          waterType: { type: Type.STRING, enum: ['potable', 'environmental', 'industrial', 'unknown'] },
          confidence: { type: Type.NUMBER },
          detections: { type: Type.ARRAY, items: { type: Type.STRING } },
          healthRisk: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ['contaminationLevel', 'waterType', 'confidence', 'detections', 'healthRisk', 'recommendation', 'explanation']
      }
    }
  });

  try {
    return JSON.parse(response.text.trim()) as WaterAnalysisResult;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Could not analyze image. Please try again.");
  }
}
