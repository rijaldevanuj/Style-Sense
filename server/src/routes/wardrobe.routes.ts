// ============================================================
// Wardrobe Routes — CRUD + Image Upload + AI Analysis
// ============================================================

import { Router, Response } from "express";
import multer from "multer";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import {
  createWardrobeItemSchema,
  updateWardrobeItemSchema,
  validate,
} from "../validators/auth.validator";
import { processAndUploadWardrobeImage, deleteWardrobeImages } from "../services/image.service";
import { analyzeClothingImage } from "../services/ai-analysis.service";
import { AuthenticatedRequest } from "../types";

const router = Router();

// Multer config — store in memory (we process with Sharp before uploading)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and HEIC images are allowed"));
    }
  },
});

// All wardrobe routes require authentication
router.use(requireAuth as any);

// ── GET /api/wardrobe ────────────────────────────────────────

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { category, color, page = "1", limit = "20" } = req.query;

    let query = supabaseAdmin
      .from("wardrobe_items")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (category && typeof category === "string") {
      query = query.eq("category", category);
    }
    if (color && typeof color === "string") {
      query = query.ilike("color", `%${color}%`);
    }

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;
    query = query.range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      data: {
        items: data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limitNum),
        },
      },
    });
  } catch (err) {
    console.error("Get wardrobe error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── GET /api/wardrobe/categories ─────────────────────────────

router.get("/categories", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from("wardrobe_items")
      .select("category")
      .eq("user_id", userId);

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    // Count items per category
    const counts: Record<string, number> = {};
    (data || []).forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        categories: counts,
        total: data?.length || 0,
      },
    });
  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── GET /api/wardrobe/:id ────────────────────────────────────

router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from("wardrobe_items")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      res.status(404).json({ success: false, error: "Item not found" });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error("Get wardrobe item error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── POST /api/wardrobe ───────────────────────────────────────
// Upload new clothing item (image + optional metadata)

router.post(
  "/",
  upload.single("image"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          success: false,
          error: "No image file provided. Send as multipart/form-data with field name 'image'.",
        });
        return;
      }

      // Parse optional metadata from form fields
      let metadata: any = {};
      if (req.body.metadata) {
        try {
          metadata = JSON.parse(req.body.metadata);
        } catch {
          // Ignore parse errors — metadata is optional
        }
      }

      // Generate a temporary ID for storage paths
      const tempId = crypto.randomUUID();

      // 1. Process & upload images (resize, thumbnail, upload to Supabase)
      const { imageUrl, thumbnailUrl } = await processAndUploadWardrobeImage(
        file.buffer,
        userId,
        tempId
      );

      // 2. AI analysis of the clothing item (async, runs in background)
      let aiMetadata;
      try {
        aiMetadata = await analyzeClothingImage(file.buffer);
      } catch (aiErr) {
        console.error("AI analysis failed, using defaults:", aiErr);
        aiMetadata = {
          category: metadata.category || "top",
          subcategory: "unknown",
          color: "unknown",
          pattern: "solid",
          material: "unknown",
          style: "casual",
          formality_level: "casual",
          season: ["spring", "summer", "autumn", "winter"],
          description: "Clothing item",
        };
      }

      // 3. Insert into database
      const { data, error } = await supabaseAdmin
        .from("wardrobe_items")
        .insert({
          id: tempId,
          user_id: userId,
          category: metadata.category || aiMetadata.category,
          subcategory: metadata.subcategory || aiMetadata.subcategory,
          color: metadata.color || aiMetadata.color,
          brand: metadata.brand || null,
          occasion_tags: metadata.occasion_tags || [],
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          ai_metadata: aiMetadata,
        })
        .select()
        .single();

      if (error) {
        res.status(400).json({ success: false, error: error.message });
        return;
      }

      res.status(201).json({
        success: true,
        data,
        message: "Item added to wardrobe! AI has analyzed it automatically.",
      });
    } catch (err) {
      console.error("Upload wardrobe item error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// ── PUT /api/wardrobe/:id ────────────────────────────────────

router.put(
  "/:id",
  validate(updateWardrobeItemSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabaseAdmin
        .from("wardrobe_items")
        .update(req.body)
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error || !data) {
        res.status(404).json({ success: false, error: "Item not found" });
        return;
      }

      res.json({
        success: true,
        data,
        message: "Item updated successfully",
      });
    } catch (err) {
      console.error("Update wardrobe item error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// ── DELETE /api/wardrobe/:id ─────────────────────────────────

router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const itemId = req.params.id;

    // Delete from database
    const { error } = await supabaseAdmin
      .from("wardrobe_items")
      .delete()
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    // Delete images from storage (fire-and-forget)
    deleteWardrobeImages(userId, itemId).catch(console.error);

    res.json({
      success: true,
      message: "Item removed from wardrobe",
    });
  } catch (err) {
    console.error("Delete wardrobe item error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
