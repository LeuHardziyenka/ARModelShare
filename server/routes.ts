import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerHealthRoutes } from "./routes/health.routes";
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerModelRoutes } from "./routes/model.routes";
import { registerShareRoutes } from "./routes/share.routes";
import { registerLogoRoutes } from "./routes/logo.routes";
import { registerProfileRoutes } from "./routes/profile.routes";
import { registerAnalyticsRoutes } from "./routes/analytics.routes";
import { registerUploadRoutes } from "./routes/upload.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all API routes (all prefixed with /api)
  registerHealthRoutes(app); // Health check for Docker/Cloud Run
  registerAuthRoutes(app);
  registerModelRoutes(app);
  registerShareRoutes(app);
  registerLogoRoutes(app);
  registerProfileRoutes(app);
  registerAnalyticsRoutes(app);
  registerUploadRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
