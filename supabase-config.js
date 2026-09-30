/* Supabase configuration — publishable key is safe for client-side use (protected by RLS) */
const SUPABASE_URL = "https://jbicfyqhyictnxafzyav.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_BRC3daMiP7JguN9e6Xg9Eg_ccZHlMZo";

var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
