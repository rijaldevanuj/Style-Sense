// ============================================================
// Robe Backend — Shared TypeScript Types
// ============================================================

import { Request } from "express";

// ── Auth ──────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// ── Database Row Types ───────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  gender: "male" | "female" | "non-binary" | "prefer-not-to-say" | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StyleProfile {
  id: string;
  user_id: string;
  body_type: string | null;
  face_shape: string | null;
  hairstyle: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  skin_tone: string | null;
  style_preferences: string[];
  updated_at: string;
}

export interface WardrobeItem {
  id: string;
  user_id: string;
  category: string;
  subcategory: string | null;
  color: string | null;
  brand: string | null;
  occasion_tags: string[];
  image_url: string;
  thumbnail_url: string | null;
  ai_metadata: ClothingAnalysis;
  created_at: string;
}

export interface OutfitSuggestion {
  id: string;
  user_id: string;
  occasion: string | null;
  formality: string | null;
  item_ids: string[];
  confidence_score: number | null;
  reasoning: string | null;
  is_saved: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  outfit_refs: string[] | null;
  created_at: string;
}

// ── AI Types ─────────────────────────────────────────────────

export interface ClothingAnalysis {
  category: string;
  subcategory: string;
  color: string;
  pattern: string;
  material: string;
  style: string;
  formality_level: "very_casual" | "casual" | "smart_casual" | "semi_formal" | "formal" | "black_tie";
  season: string[];
  description: string;
}

export interface OutfitRecommendation {
  outfit_items: string[];      // wardrobe item IDs
  occasion: string;
  formality: string;
  reasoning: string;
  confidence_score: number;
  missing_pieces?: string[];   // suggestions for items user doesn't have
}

export interface AIOutfitResponse {
  message: string;
  outfits: OutfitRecommendation[];
}

// ── API Response Helpers ─────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
