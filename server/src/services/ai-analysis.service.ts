// ============================================================
// AI Analysis Service — Clothing Image Analysis via Gemini
// ============================================================

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { ClothingAnalysis } from "../types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const ANALYSIS_PROMPT = `You are a fashion AI expert. Analyze this clothing image and return a JSON object with the following fields:

{
  "category": "top" | "bottom" | "shoe" | "accessory" | "outerwear" | "dress" | "activewear",
  "subcategory": "specific type (e.g., t-shirt, jeans, sneakers, watch, blazer, sundress)",
  "color": "primary color (e.g., navy blue, charcoal grey, olive green)",
  "pattern": "solid" | "striped" | "plaid" | "floral" | "graphic" | "abstract" | "polka-dot" | "camo" | "paisley" | "checkered",
  "material": "best guess (e.g., cotton, denim, leather, polyester, silk, wool, linen)",
  "style": "casual" | "streetwear" | "classic" | "bohemian" | "minimalist" | "sporty" | "elegant" | "grunge" | "preppy" | "vintage",
  "formality_level": "very_casual" | "casual" | "smart_casual" | "semi_formal" | "formal" | "black_tie",
  "season": ["array of suitable seasons: spring, summer, autumn, winter"],
  "description": "A brief 1-sentence description of the item"
}

IMPORTANT: Return ONLY the JSON object. No markdown, no code fences, no extra text.`;

/**
 * Analyzes a clothing image using Gemini Vision.
 * Returns structured metadata about the clothing item.
 */
export async function analyzeClothingImage(
  imageBuffer: Buffer
): Promise<ClothingAnalysis> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: "image/webp" as const,
      },
    };

    const result = await model.generateContent([ANALYSIS_PROMPT, imagePart]);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response (strip any accidental markdown)
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const analysis: ClothingAnalysis = JSON.parse(cleaned);

    return analysis;
  } catch (err) {
    console.error("Clothing analysis error:", err);

    // Return sensible defaults if AI fails
    return {
      category: "top",
      subcategory: "unknown",
      color: "unknown",
      pattern: "solid",
      material: "unknown",
      style: "casual",
      formality_level: "casual",
      season: ["spring", "summer", "autumn", "winter"],
      description: "Clothing item (AI analysis failed)",
    };
  }
}
