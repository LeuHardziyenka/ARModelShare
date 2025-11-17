import { z } from "zod";

// ============================================================================
// MODEL SCHEMA - For 3D models uploaded by users
// ============================================================================

export const modelSchema = z.object({
  id: z.string(),
  userId: z.string(),
  filename: z.string(),
  fileSize: z.number(),
  modelUrl: z.string(),
  uploadedAt: z.number(),
  validationStatus: z.enum(['processing', 'ready', 'warning', 'failed', 'error']),
  validationIssues: z.array(z.string()).optional(),
});

export const insertModelSchema = modelSchema.omit({ 
  id: true,
  uploadedAt: true,
});

export type Model = z.infer<typeof modelSchema>;
export type InsertModel = z.infer<typeof insertModelSchema>;

// ============================================================================
// SHARED LINK SCHEMA - For shareable links with QR codes
// ============================================================================

export const qrOptionsSchema = z.object({
  fgColor: z.string().default('#000000'),
  bgColor: z.string().default('#ffffff'),
  level: z.enum(['L', 'M', 'Q', 'H']).default('M'),
  logoUrl: z.string().optional(),
  logoSize: z.number().min(10).max(30).default(20), // Logo size as percentage of QR code (10-30%)
  includeLogo: z.boolean().default(false),
});

export const sharedLinkSchema = z.object({
  id: z.string(),
  userId: z.string(),
  modelId: z.string(),
  modelUrl: z.string(),
  modelName: z.string(),
  createdAt: z.number(),
  expiresAt: z.number(),
  isActive: z.boolean(),
  qrOptions: qrOptionsSchema,
  views: z.number().default(0),
  scans: z.number().default(0),
});

export const insertSharedLinkSchema = sharedLinkSchema.omit({ 
  id: true,
  createdAt: true,
  views: true,
  scans: true,
});

export type SharedLink = z.infer<typeof sharedLinkSchema>;
export type InsertSharedLink = z.infer<typeof insertSharedLinkSchema>;
export type QROptions = z.infer<typeof qrOptionsSchema>;

// ============================================================================
// ANALYTICS SCHEMA
// ============================================================================

export const statTrendSchema = z.object({
  value: z.number(),
  isPositive: z.boolean(),
  message: z.string().optional(),
});

export const analyticsStatsSchema = z.object({
  totalModels: z.number(),
  activeLinks: z.number(),
  totalScans: z.number(),
  totalViews: z.number(),
  totalModelsTrend: statTrendSchema.optional(),
  activeLinksTrend: statTrendSchema.optional(),
  totalScansTrend: statTrendSchema.optional(),
  totalViewsTrend: statTrendSchema.optional(),
});

export const monthlyStatsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  month: z.number(),
  year: z.number(),
  totalModels: z.number(),
  activeLinks: z.number(),
  totalScans: z.number(),
  totalViews: z.number(),
  createdAt: z.number(),
});

export const activityEventSchema = z.object({
  id: z.string(),
  type: z.enum(['upload', 'share', 'view', 'scan', 'delete']),
  timestamp: z.number(),
  description: z.string(),
  metadata: z.record(z.any()).optional(),
});

export type StatTrend = z.infer<typeof statTrendSchema>;
export type AnalyticsStats = z.infer<typeof analyticsStatsSchema>;
export type MonthlyStats = z.infer<typeof monthlyStatsSchema>;
export type ActivityEvent = z.infer<typeof activityEventSchema>;

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

export const validationStageSchema = z.object({
  stage: z.enum(['file-integrity', 'format-validation', 'ar-compatibility']),
  status: z.enum(['pending', 'processing', 'passed', 'failed']),
  message: z.string().optional(),
});

export type ValidationStage = z.infer<typeof validationStageSchema>;

// ============================================================================
// USER SCHEMA (Firebase Auth will handle most of this)
// ============================================================================

export const userProfileSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

// ============================================================================
// USER SCHEMA - For backend storage (template/unused)
// ============================================================================

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
});

export const insertUserSchema = userSchema.omit({ id: true });

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// ============================================================================
// USER DETAILS SCHEMA - Extended profile information
// ============================================================================

export const userDetailsSchema = z.object({
  id: z.string(),
  displayName: z.string().optional(),
  phone: z.string().optional(),
  userLogo: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const updateUserDetailsSchema = userDetailsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserDetails = z.infer<typeof userDetailsSchema>;
export type UpdateUserDetails = z.infer<typeof updateUserDetailsSchema>;

// ============================================================================
// USER LOGOS SCHEMA - For QR code logo collection
// ============================================================================

export const userLogoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  logoUrl: z.string(),
  createdAt: z.number(),
});

export const insertUserLogoSchema = userLogoSchema.omit({
  id: true,
  createdAt: true,
});

export type UserLogo = z.infer<typeof userLogoSchema>;
export type InsertUserLogo = z.infer<typeof insertUserLogoSchema>;
