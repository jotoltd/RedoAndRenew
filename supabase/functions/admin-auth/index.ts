import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// admin_config has no anon policies — the password is only readable here
const checkPassword = async (password: string) => {
  const { data } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", "admin_password")
    .maybeSingle();
  return Boolean(data && data.value && data.value === password);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { action, password, next } = await req.json();
    if (typeof password !== "string" || password.length === 0) {
      return json({ ok: false }, 401);
    }

    if (action === "verify") {
      return json({ ok: await checkPassword(password) });
    }

    if (action === "set_password") {
      if (!(await checkPassword(password))) return json({ ok: false }, 401);
      if (typeof next !== "string" || next.length < 6) {
        return json({ error: "New password needs at least 6 characters" }, 400);
      }
      const { error } = await supabase
        .from("admin_config")
        .upsert({ key: "admin_password", value: next });
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Auth failed" }, 500);
  }
});
