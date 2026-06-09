// ============================================================
// Gemini Service — Chat-based Outfit Recommendations
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin } from "../lib/supabase";
import { buildOutfitSystemPrompt } from "../prompts/outfit-system";
import { AIOutfitResponse, ChatMessage, WardrobeItem, StyleProfile } from "../types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Generates an outfit recommendation based on user's message, wardrobe, and profile.
 *
 * Flow:
 *   1. Fetches user's wardrobe items + style profile
 *   2. Builds fashion-aware system prompt with wardrobe inventory
 *   3. Includes recent chat history for conversation context
 *   4. Sends to Gemini 2.0 Flash
 *   5. Parses structured response (outfit IDs + reasoning)
 *   6. Saves both messages to chat_messages table
 *   7. Creates outfit_suggestions rows for each suggested outfit
 */
export async function generateOutfitRecommendation(
  userId: string,
  userMessage: string
): Promise<{ aiResponse: string; outfits: any[] }> {
  // 1. Fetch user's wardrobe
  const { data: wardrobeItems } = await supabaseAdmin
    .from("wardrobe_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // 2. Fetch style profile
  const { data: styleProfile } = await supabaseAdmin
    .from("style_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  // 3. Fetch recent chat history (last 10 messages for context)
  const { data: recentChats } = await supabaseAdmin
    .from("chat_messages")
    .select("role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  // 4. Build system prompt with wardrobe + profile
  const systemPrompt = buildOutfitSystemPrompt(
    styleProfile,
    wardrobeItems || []
  );

  // 5. Build conversation history for Gemini
  const chatHistory = (recentChats || [])
    .reverse()
    .map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

  // 6. Call Gemini
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const chat = model.startChat({
    history: chatHistory as any,
  });

  const result = await chat.sendMessage(userMessage);
  const aiText = result.response.text();

  // 7. Save user message to DB
  await supabaseAdmin.from("chat_messages").insert({
    user_id: userId,
    role: "user",
    content: userMessage,
  });

  // 8. Try to parse structured outfit data from AI response
  let parsedOutfits: any[] = [];
  try {
    const jsonMatch = aiText.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const parsed: AIOutfitResponse = JSON.parse(jsonMatch[1]);
      parsedOutfits = parsed.outfits || [];
    }
  } catch {
    // AI response was conversational without structured data — that's fine
  }

  // 9. Save outfit suggestions to DB
  const savedOutfitIds: string[] = [];
  for (const outfit of parsedOutfits) {
    const { data: savedOutfit } = await supabaseAdmin
      .from("outfit_suggestions")
      .insert({
        user_id: userId,
        occasion: outfit.occasion || null,
        formality: outfit.formality || null,
        item_ids: outfit.outfit_items || [],
        confidence_score: outfit.confidence_score || null,
        reasoning: outfit.reasoning || null,
        is_saved: false,
      })
      .select("id")
      .single();

    if (savedOutfit) {
      savedOutfitIds.push(savedOutfit.id);
    }
  }

  // 10. Save AI response to DB (with outfit references)
  await supabaseAdmin.from("chat_messages").insert({
    user_id: userId,
    role: "assistant",
    content: aiText,
    outfit_refs: savedOutfitIds.length > 0 ? savedOutfitIds : null,
  });

  return {
    aiResponse: aiText,
    outfits: parsedOutfits.map((o, i) => ({
      ...o,
      id: savedOutfitIds[i] || null,
    })),
  };
}
