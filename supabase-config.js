/* Supabase configuration — anon key is safe for client-side use (protected by RLS) */
const SUPABASE_URL = "https://jbicfyqhyictnxafzyav.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiaWNmeXFoeWljdG54YWZ6eWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1OTgwODEsImV4cCI6MjEwNTE3NDA4MX0.9ymQImK1lOzu8-4ILvxl3nSMHDqnvl7eLfTpb3I0DwQ";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Admin login credentials — change these to whatever you want */
const ADMIN_EMAIL = "charline@redoandrenew.co.uk";
const ADMIN_PASSWORD = "changeme123";
