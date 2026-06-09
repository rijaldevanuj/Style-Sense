// ============================================================
// Auth Routes — Signup, Login, Refresh, Me
// ============================================================

import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { signupSchema, loginSchema, validate } from "../validators/auth.validator";
import { AuthenticatedRequest } from "../types";

const router = Router();

// ── POST /api/auth/signup ────────────────────────────────────

router.post("/signup", validate(signupSchema), async (req, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Create user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for MVP
      user_metadata: { name },
    });

    if (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // Sign in immediately to get tokens
    const { data: session, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (signInError) {
      res.status(400).json({
        success: false,
        error: "Account created but failed to sign in. Please try logging in.",
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          name,
        },
        session: {
          access_token: session.session?.access_token,
          refresh_token: session.session?.refresh_token,
          expires_in: session.session?.expires_in,
        },
      },
      message: "Account created successfully!",
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────

router.post("/login", validate(loginSchema), async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || null,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
        },
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── POST /api/auth/refresh ───────────────────────────────────

router.post("/refresh", async (req, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({
        success: false,
        error: "refresh_token is required",
      });
      return;
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      res.status(401).json({
        success: false,
        error: "Invalid or expired refresh token.",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
      },
    });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────

router.get(
  "/me",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      // Fetch profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        res.status(404).json({ success: false, error: "Profile not found" });
        return;
      }

      // Fetch style profile
      const { data: styleProfile } = await supabaseAdmin
        .from("style_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      res.json({
        success: true,
        data: {
          profile,
          style_profile: styleProfile || null,
        },
      });
    } catch (err) {
      console.error("Get me error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

export default router;
