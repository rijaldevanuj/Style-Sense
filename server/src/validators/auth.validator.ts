// ============================================================
// Zod Validators — Request Body Schemas
// ============================================================

import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────────

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required").max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ── Profile ──────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  gender: z
    .enum(["male", "female", "non-binary", "prefer-not-to-say"])
    .optional(),
});

export const updateStyleProfileSchema = z.object({
  body_type: z
    .enum(["ectomorph", "mesomorph", "endomorph", "slim", "athletic", "average", "plus-size"])
    .optional(),
  face_shape: z
    .enum(["oval", "round", "square", "heart", "oblong", "diamond", "triangle"])
    .optional(),
  hairstyle: z.string().max(50).optional(),
  height_cm: z.number().min(100).max(250).optional(),
  weight_kg: z.number().min(30).max(300).optional(),
  skin_tone: z
    .enum(["fair", "light", "medium", "olive", "tan", "brown", "dark"])
    .optional(),
  style_preferences: z
    .array(z.string())
    .max(20, "Maximum 20 style preferences")
    .optional(),
});

// ── Wardrobe ─────────────────────────────────────────────────

export const createWardrobeItemSchema = z.object({
  category: z.enum(["top", "bottom", "shoe", "accessory", "outerwear", "dress", "activewear"]),
  subcategory: z.string().max(50).optional(),
  color: z.string().max(30).optional(),
  brand: z.string().max(100).optional(),
  occasion_tags: z.array(z.string()).max(10).optional(),
});

export const updateWardrobeItemSchema = z.object({
  category: z
    .enum(["top", "bottom", "shoe", "accessory", "outerwear", "dress", "activewear"])
    .optional(),
  subcategory: z.string().max(50).optional(),
  color: z.string().max(30).optional(),
  brand: z.string().max(100).optional(),
  occasion_tags: z.array(z.string()).max(10).optional(),
});

// ── Chat ─────────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000),
});

// ── Validate Helper ──────────────────────────────────────────

import { Request, Response, NextFunction } from "express";

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * Returns 400 with detailed errors if validation fails.
 */
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
