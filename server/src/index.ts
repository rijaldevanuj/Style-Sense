// ============================================================
// Robe Backend — Express Server Entry Point
// ============================================================

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import helmet from "helmet";

// Route imports
import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import wardrobeRoutes from "./routes/wardrobe.routes";
import chatRoutes from "./routes/chat.routes";
import outfitRoutes from "./routes/outfit.routes";

const app = express();
const PORT = process.env.PORT || 3001;

// ── Global Middleware ────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: process.env.NODE_ENV === "production"
      ? ["https://your-app-domain.com"]
      : ["http://localhost:8081", "http://localhost:19006", "http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Request Logging (dev only) ───────────────────────────────

if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
    next();
  });
}

// ── Health Check ─────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "🧥 Robe API is running!",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ───────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/wardrobe", wardrobeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/outfits", outfitRoutes);

// ── 404 Handler ──────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found. Check the API docs.",
  });
});

// ── Global Error Handler ─────────────────────────────────────

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);

    // Multer file size error
    if (err.message?.includes("File too large")) {
      res.status(413).json({
        success: false,
        error: "File too large. Maximum size is 10MB.",
      });
      return;
    }

    // Multer file type error
    if (err.message?.includes("Only JPEG")) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    });
  }
);

// ── Start Server ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║                                          ║
  ║   🧥 Robe API Server                     ║
  ║   Running on http://localhost:${PORT}       ║
  ║   Environment: ${process.env.NODE_ENV || "development"}            ║
  ║                                          ║
  ╚══════════════════════════════════════════╝

  API Endpoints:
  ├── GET    /api/health
  ├── POST   /api/auth/signup
  ├── POST   /api/auth/login
  ├── POST   /api/auth/refresh
  ├── GET    /api/auth/me
  ├── GET    /api/profile
  ├── PUT    /api/profile
  ├── PUT    /api/profile/style
  ├── POST   /api/profile/avatar
  ├── GET    /api/wardrobe
  ├── GET    /api/wardrobe/categories
  ├── GET    /api/wardrobe/:id
  ├── POST   /api/wardrobe
  ├── PUT    /api/wardrobe/:id
  ├── DELETE /api/wardrobe/:id
  ├── POST   /api/chat/message
  ├── GET    /api/chat/history
  ├── DELETE /api/chat/history
  ├── GET    /api/outfits
  ├── POST   /api/outfits/:id/save
  ├── DELETE /api/outfits/:id
  └── POST   /api/outfits/generate
  `);
});

export default app;
