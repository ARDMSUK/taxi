import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zrvtlhwxdhsskwuqstbj.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydnRsaHd4ZGhzc2t3dXFzdGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk5NDEsImV4cCI6MjA4NTIyNTk0MX0.u4eJR35cdoUsApiLJjKVfuwCmO7afCZxF1Bt_dXA5Ew';

const options: any = {
  auth: {
    persistSession: false, // Session persistence is handled by our authStore
  }
};

// Polyfill WebSocket in Node environment (during Expo static export)
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  try {
    const ws = eval("require('ws')");
    options.realtime = {
      transport: ws
    };
  } catch (err) {
    console.warn("EAS Build Node Warning: 'ws' package not found or failed to load. WebSocket polyfill skipped.");
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);

