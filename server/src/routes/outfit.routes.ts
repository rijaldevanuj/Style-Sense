// ============================================================
// Outfit Routes — Save & Manage Outfit Suggestions
// ============================================================

import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";

const router = Router();

// All outfit routes require authentication
router.use(requireAuth as any);

// ── GET /api/outfits ─────────────────────────────────────────
// List saved outfit suggestions

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { saved_only = "false" } = req.query;

    let query = supabaseAdmin
      .from("outfit_suggestions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (saved_only === "true") {
      query = query.eq("is_saved", true);
    }

    const { data, error } = await query;

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    // Hydrate with wardrobe item details
    const allItemIds = (data || []).flatMap((o) => o.item_ids || []);
    const uniqueIds = [...new Set(allItemIds)];

    let wardrobeItems: any[] = [];
    if (uniqueIds.length > 0) {
      const { data: items } = await supabaseAdmin
        .from("wardrobe_items")
        .select("id, category, subcategory, color, brand, image_url, thumbnail_url")
        .in("id", uniqueIds);
      wardrobeItems = items || [];
    }

    const enrichedOutfits = (data || []).map((outfit) => ({
      ...outfit,
      items: wardrobeItems.filter((item) =>
        outfit.item_ids?.includes(item.id)
      ),
    }));

    res.json({
      success: true,
      data: enrichedOutfits,
    });
  } catch (err) {
    console.error("Get outfits error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── POST /api/outfits/:id/save ───────────────────────────────
// Toggle save on an outfit suggestion

router.post("/:id/save", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get current state
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("outfit_suggestions")
      .select("is_saved")
      .eq("id", req.params.id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ success: false, error: "Outfit not found" });
      return;
    }

    // Toggle
    const { data, error } = await supabaseAdmin
      .from("outfit_suggestions")
      .update({ is_saved: !existing.is_saved })
      .eq("id", req.params.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      data,
      message: data.is_saved ? "Outfit saved!" : "Outfit unsaved",
    });
  } catch (err) {
    console.error("Toggle save outfit error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── DELETE /api/outfits/:id ──────────────────────────────────

router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { error } = await supabaseAdmin
      .from("outfit_suggestions")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", userId);

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      message: "Outfit deleted",
    });
  } catch (err) {
    console.error("Delete outfit error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── POST /api/outfits/generate ───────────────────────────────
// Direct generation without chat context

router.post("/generate", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { occasion, formality } = req.body;

    if (!occasion) {
      res.status(400).json({
        success: false,
        error: "occasion is required (e.g., 'office meeting', 'date night', 'casual brunch')",
      });
      return;
    }

    // Import and call gemini service
    const { generateOutfitRecommendation } = await import(
      "../services/gemini.service"
    );

    const prompt = `Suggest 2-3 outfit options for: ${occasion}${
      formality ? ` (${formality} dress code)` : ""
    }`;

    const result = await generateOutfitRecommendation(userId, prompt);

    res.json({
      success: true,
      data: {
        outfits: result.outfits,
        message: result.aiResponse,
      },
    });
  } catch (err) {
    console.error("Generate outfit error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
