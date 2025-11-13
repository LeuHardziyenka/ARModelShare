// Re-export all shared types for convenience
export type {
  Model,
  InsertModel,
  SharedLink,
  InsertSharedLink,
  QROptions,
  AnalyticsStats,
  StatTrend,
  MonthlyStats,
  ActivityEvent,
  ValidationStage,
  UserProfile,
  UserDetails,
  UpdateUserDetails,
  UserLogo,
  InsertUserLogo,
} from '@shared/schema';

// Additional frontend-only types
export interface UploadProgress {
  percent: number;
  bytesUploaded: number;
  totalBytes: number;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
