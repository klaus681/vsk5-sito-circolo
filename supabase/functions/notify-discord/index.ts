import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_KEY = /^discord_webhook(_[a-z]+)?$/;
const WEBHOOK_RE = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//i;

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json({ error: "missing_env" }, 500);

  // 1) Autenticazione: solo utenti loggati
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);

  const authClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);
  const user = userData.user;

  const admin = createClient(url, service, { auth: { persistSession: false } });

  // 2) Solo soci approvati (stato assente = installazione precedente alla migrazione)
  const { data: prof } = await admin
    .from("profiles")
    .select("stato")
    .eq("id", user.id)
    .maybeSingle();
  const active = !!prof && (prof.stato === "attivo" || prof.stato == null);
  if (!active) return json({ error: "pending_member" }, 403);

  // 3) Payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const keys: string[] = Array.isArray(body?.keys)
    ? body.keys.filter((k: unknown) => typeof k === "string" && ALLOWED_KEY.test(k as string))
    : [];
  const embed = body?.embed;
  if (!keys.length || !embed || typeof embed !== "object") {
    return json({ error: "bad_request" }, 400);
  }
  if (JSON.stringify(embed).length > 6000) return json({ error: "embed_too_large" }, 413);

  // 4) Webhook risolto lato server (mai esposto al client)
  const { data: settings, error: settingsError } = await admin
    .from("site_settings")
    .select("key,value")
    .in("key", keys);
  if (settingsError) return json({ error: "settings_error" }, 500);

  const map = new Map<string, string>(
    (settings || []).map((r: any) => [String(r.key), String(r.value || "").trim()]),
  );
  let webhook = "";
  for (const k of keys) {
    const v = map.get(k) || "";
    if (v && WEBHOOK_RE.test(v)) {
      webhook = v;
      break;
    }
  }
  if (!webhook) return json({ error: "webhook_missing" }, 404);

  // 5) Invio a Discord
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "CVI Virtual", embeds: [embed] }),
  });
  if (!res.ok && res.status !== 204) {
    console.error("discord status", res.status, await res.text().catch(() => ""));
    return json({ error: "discord_error", status: res.status }, 502);
  }

  return json({ ok: true }, 200);
});
