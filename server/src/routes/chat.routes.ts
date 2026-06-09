// ============================================================
// Chat Routes — AI Outfit Chat Interface
// ============================================================

import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { chatMessageSchema, validate } from "../validators/auth.validator";
import { generateOutfitRecommendation } from "../services/gemini.service";
import { AuthenticatedRequest } from "../types";

const router = Router();

// All chat routes require authentication
router.use(requireAuth as any);

// ── POST /api/chat/message ───────────────────────────────────
// Send a message and get an AI outfit recommendation

router.post(
  "/message",
  validate(chatMessageSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { message } = req.body;

      // Generate outfit recommendation via Gemini
      const result = await generateOutfitRecommendation(userId, message);

      // If outfits were suggested, fetch the wardrobe items for display
      let outfitItems: any[] = [];
      if (result.outfits.length > 0) {
        const allItemIds = result.outfits.flatMap((o) => o.outfit_items || []);
        const uniqueIds = [...new Set(allItemIds)];

        if (uniqueIds.length > 0) {
          const { data: items } = await supabaseAdmin
            .from("wardrobe_items")
            .select("id, category, subcategory, color, brand, image_url, thumbnail_url")
            .in("id", uniqueIds);

          outfitItems = items || [];
        }
      }

      res.json({
        success: true,
        data: {
          message: result.aiResponse,
          outfits: result.outfits.map((outfit) => ({
            ...outfit,
            items: outfitItems.filter((item) =>
              outfit.outfit_items?.includes(item.id)
            ),
          })),
        },
      });
    } catch (err) {
      console.error("Chat message error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to generate outfit recommendation. Please try again.",
      });
    }
  }
);

// ── GET /api/chat/history ────────────────────────────────────

router.get("/history", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = "1", limit = "50" } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const { data, error, count } = await supabaseAdmin
      .from("chat_messages")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limitNum - 1);

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      data: {
        messages: data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limitNum),
        },
      },
    });
  } catch (err) {
    console.error("Get chat history error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── DELETE /api/chat/history ─────────────────────────────────

router.delete("/history", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { error } = await supabaseAdmin
      .from("chat_messages")
      .delete()
      .eq("user_id", userId);

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      message: "Chat history cleared",
    });
  } catch (err) {
    console.error("Delete chat history error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
