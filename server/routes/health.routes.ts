import type { Express } from "express";

/**
 * Health check endpoint for Docker and Cloud Run
 * Returns 200 OK if the server is running
 */
export function registerHealthRoutes(app: Express) {
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development"
    });
  });
}
