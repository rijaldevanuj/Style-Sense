// ============================================================
// Profile Routes — View & Update Profile + Style Profile
// ============================================================

import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import {
  updateProfileSchema,
  updateStyleProfileSchema,
  validate,
} from "../validators/auth.validator";
import { AuthenticatedRequest } from "../types";

const router = Router();

// All profile routes require authentication
router.use(requireAuth as any);

// ── GET /api/profile ─────────────────────────────────────────

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      res.status(404).json({ success: false, error: "Profile not found" });
      return;
    }

    const { data: styleProfile } = await supabaseAdmin
      .from("style_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    res.json({
      success: true,
      data: {
        ...profile,
        style_profile: styleProfile || null,
      },
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── PUT /api/profile ─────────────────────────────────────────

router.put(
  "/",
  validate(updateProfileSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update(req.body)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        res.status(400).json({ success: false, error: error.message });
        return;
      }

      res.json({
        success: true,
        data,
        message: "Profile updated successfully",
      });
    } catch (err) {
      console.error("Update profile error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// ── PUT /api/profile/style ───────────────────────────────────

router.put(
  "/style",
  validate(updateStyleProfileSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      // Upsert — create if doesn't exist, update if it does
      const { data, error } = await supabaseAdmin
        .from("style_profiles")
        .upsert(
          { user_id: userId, ...req.body },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) {
        res.status(400).json({ success: false, error: error.message });
        return;
      }

      res.json({
        success: true,
        data,
        message: "Style profile updated successfully",
      });
    } catch (err) {
      console.error("Update style profile error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// ── POST /api/profile/avatar ─────────────────────────────────

router.post(
  "/avatar",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      // This endpoint expects the avatar to be uploaded via multer middleware
      // which will be added when the image service is integrated
      const file = (req as any).file;

      if (!file) {
        res.status(400).json({
          success: false,
          error: "No image file provided. Send as multipart/form-data with field name 'avatar'.",
        });
        return;
      }

      // Upload to Supabase Storage
      const fileName = `${userId}/avatar.webp`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("avatars")
        .upload(fileName, file.buffer, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        res.status(500).json({ success: false, error: uploadError.message });
        return;
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile
      await supabaseAdmin
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", userId);

      res.json({
        success: true,
        data: { avatar_url: urlData.publicUrl },
        message: "Avatar updated successfully",
      });
    } catch (err) {
      console.error("Upload avatar error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

export default router;
