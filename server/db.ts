// IMPORTANT: Import env first to ensure variables are loaded
import './env.js';
import { createClient } from '@supabase/supabase-js';

// Backend uses non-VITE prefixed variables (VITE_ prefix is only for frontend/Vite)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_KEY');
}

// Server-side Supabase client with service role key for admin operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabase;
