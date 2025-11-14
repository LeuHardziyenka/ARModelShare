// THIS FILE MUST BE IMPORTED FIRST, BEFORE ANY OTHER IMPORTS
// It loads environment variables and validates they exist

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (one level up from server/)
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
  console.error('Looking for .env at:', envPath);
  process.exit(1);
}

// Validate required environment variables
const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missingVars = requiredVars.filter(v => !process.env[v] || process.env[v] === 'your_service_role_key_here');

if (missingVars.length > 0) {
  console.error('❌ Missing or invalid required environment variables:', missingVars);
  console.error('\nPlease set these in your .env file:');
  missingVars.forEach(v => console.error(`  - ${v}`));
  process.exit(1);
}

// Export for convenience
export const env = {
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY!,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
