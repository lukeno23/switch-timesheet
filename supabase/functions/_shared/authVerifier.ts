// =============================================================
// Auth Verification Helper for Admin Edge Functions
// Verifies x-switch-auth header against SWITCH_AUTH_HASH secret.
// Returns null if authorized, or a 401 Response if not.
// Pattern follows sync/index.ts authenticateRequest (T-03-01).
// =============================================================

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-switch-auth",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function verifyAuthHash(req: Request): Response | null {
  const authHash = req.headers.get("x-switch-auth");
  const expectedHash = Deno.env.get("SWITCH_AUTH_HASH");

  if (!authHash || !expectedHash || authHash !== expectedHash) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null; // Authorized
}
