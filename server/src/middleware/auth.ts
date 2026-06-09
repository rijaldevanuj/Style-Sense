// ============================================================
// Auth Middleware — JWT Verification via Supabase
// ============================================================

import { Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthenticatedRequest } from "../types";

/**
 * Middleware that verifies the Bearer token from the Authorization header.
 * On success, attaches `req.user` with { id, email }.
 * On failure, returns 401 Unauthorized.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Missing or invalid Authorization header. Expected: Bearer <token>",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify the JWT with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        error: "Invalid or expired token. Please log in again.",
      });
      return;
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email!,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error during authentication.",
    });
  }
}
