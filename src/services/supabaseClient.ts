import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Falta REACT_APP_SUPABASE_URL o REACT_APP_SUPABASE_ANON_KEY en .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);