// Supabase Edge Function: privileged user management (delete / password reset).
//
// WHY THIS EXISTS:
//   Deleting an auth user or setting a new password requires the Supabase
//   *service role* key. That key must NEVER live in the browser bundle, so these
//   actions run here, server-side, behind an admin check.
//
// DEPLOY:
//   1. Install the Supabase CLI and run:  supabase functions deploy admin-users
//   2. Set the secret (service role key from Project Settings → API):
//        supabase secrets set SERVICE_ROLE_KEY=your-service-role-key
//   (SUPABASE_URL and SUPABASE_ANON_KEY are provided by the platform automatically.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Identify the caller from their JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return json({ error: "Not authenticated" }, 401);
    }

    // 2. Verify the caller is an ADMIN.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: callerProfile } = await admin
      .from("profiles").select("role").eq("id", caller.id).single();
    if (callerProfile?.role !== "ADMIN") {
      return json({ error: "Forbidden: admin only" }, 403);
    }

    // 3. Perform the requested action.
    const { action, userId } = await req.json();
    if (!userId) return json({ error: "userId is required" }, 400);

    if (action === "delete") {
      await admin.from("profiles").delete().eq("id", userId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "reset") {
      const newPassword = Math.random().toString(36).slice(-10);
      const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true, password: newPassword });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
