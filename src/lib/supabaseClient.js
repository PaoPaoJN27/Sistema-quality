// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // <-- AQUÍ EL CAMBIO

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
