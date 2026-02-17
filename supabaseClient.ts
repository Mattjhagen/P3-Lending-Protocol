import { createClient } from '@supabase/supabase-js';

// Public fallback values keep existing beta behavior while envs are being rolled out.
const FALLBACK_SUPABASE_URL = 'https://mxwousrkbdttlgsfqjsk.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14d291c3JrYmR0dGxnc2ZxanNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODcyMzcsImV4cCI6MjA4NTU2MzIzN30.ZB9wR6DCdV1WZlE7J8l6OuoPBJp0n5Zj1iN_VxX5xuM';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '[P3_ENV] Using fallback Supabase client config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify/local envs.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
