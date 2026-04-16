// =============================================================
// Admin Edge Function — Multiplexed CRUD Controller
// Single endpoint with action routing for all admin operations.
// Auth: x-switch-auth header verified against SWITCH_AUTH_HASH.
// All responses use plain-English error messages per D-11.
// CORS enabled for browser-origin requests.
// =============================================================

import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { verifyAuthHash, corsHeaders } from "../_shared/authVerifier.ts";

// =============================================================
// Response Helpers
// =============================================================

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// =============================================================
// Allowed department values (from Legend.pdf)
// =============================================================

const ALLOWED_DEPARTMENTS = [
  "Brand",
  "Design",
  "Marketing",
  "PM",
  "Management",
  "Cross-Department",
];

// =============================================================
// Switcher Handlers
// =============================================================

async function handleCreateSwitcher(
  payload: Record<string, unknown>,
): Promise<Response> {
  const { name, email, primary_dept, is_management_member } = payload;

  if (!name || !email || !primary_dept) {
    return jsonResponse(
      { error: "Name, email, and primary department are required." },
      400,
    );
  }

  // Email uniqueness check
  const { data: existingEmail } = await supabaseAdmin
    .from("switchers")
    .select("id")
    .eq("email", email)
    .limit(1);

  if (existingEmail && existingEmail.length > 0) {
    return jsonResponse(
      { error: "A Switcher with that email already exists." },
      409,
    );
  }

  // Name uniqueness check
  const { data: existingName } = await supabaseAdmin
    .from("switchers")
    .select("id")
    .eq("name", name)
    .limit(1);

  if (existingName && existingName.length > 0) {
    return jsonResponse(
      { error: "A Switcher with that name already exists." },
      409,
    );
  }

  const { data, error } = await supabaseAdmin
    .from("switchers")
    .insert({
      name,
      email,
      primary_dept,
      is_management_member: is_management_member ?? false,
    })
    .select()
    .single();

  if (error) {
    return jsonResponse(
      { error: "Could not create Switcher. Please try again." },
      500,
    );
  }

  return jsonResponse({ ok: true, data });
}

async function handleUpdateSwitcher(
  payload: Record<string, unknown>,
): Promise<Response> {
  const { id, name, email, primary_dept, is_management_member, active, confirmed } =
    payload;

  if (!id) {
    return jsonResponse({ error: "Switcher ID is required." }, 400);
  }

  // Deactivation warning: check for upcoming events
  if (active === false && !confirmed) {
    const { count } = await supabaseAdmin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("switcher_id", id)
      .eq("temporal_status", "upcoming");

    if (count && count > 0) {
      // Fetch the switcher name for the warning message
      const { data: switcher } = await supabaseAdmin
        .from("switchers")
        .select("name")
        .eq("id", id)
        .single();

      const switcherName = switcher?.name || "This Switcher";
      return jsonResponse({
        warning: `${switcherName} has ${count} upcoming calendar event${count > 1 ? "s" : ""} in the next 14 days. Deactivating will exclude them from the next sync. Are you sure?`,
        requireConfirmation: true,
      });
    }
  }

  // Email uniqueness check (excluding self)
  if (email) {
    const { data: existingEmail } = await supabaseAdmin
      .from("switchers")
      .select("id")
      .eq("email", email)
      .neq("id", id)
      .limit(1);

    if (existingEmail && existingEmail.length > 0) {
      return jsonResponse(
        { error: "A Switcher with that email already exists." },
        409,
      );
    }
  }

  // Build update object with only provided fields
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (primary_dept !== undefined) updates.primary_dept = primary_dept;
  if (is_management_member !== undefined) updates.is_management_member = is_management_member;
  if (active !== undefined) updates.active = active;

  const { data, error } = await supabaseAdmin
    .from("switchers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return jsonResponse(
      { error: "Could not update Switcher. Please try again." },
      500,
    );
  }

  return jsonResponse({ ok: true, data });
}

// =============================================================
// Client Handlers
// =============================================================

async function handleCreateClient(
  payload: Record<string, unknown>,
): Promise<Response> {
  const { name, target_hourly_rate } = payload;

  if (!name) {
    return jsonResponse({ error: "Client name is required." }, 400);
  }

  // Name uniqueness check
  const { data: existing } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("name", name)
    .limit(1);

  if (existing && existing.length > 0) {
    return jsonResponse(
      { error: "A client with that name already exists." },
      409,
    );
  }

  const insertObj: Record<string, unknown> = { name };
  if (target_hourly_rate !== undefined) {
    insertObj.target_hourly_rate = target_hourly_rate;
  }

  const { data, error } = await supabaseAdmin
    .from("clients")
    .insert(insertObj)
    .select()
    .single();

  if (error) {
    return jsonResponse(
      { error: "Could not create client. Please try again." },
      500,
    );
  }

  return jsonResponse({ ok: true, data });
}

async function handleUpdateClient(
  payload: Record<string, unknown>,
): Promise<Response> {
  const { id, name, target_hourly_rate, active } = payload;

  if (!id) {
    return jsonResponse({ error: "Client ID is required." }, 400);
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (target_hourly_rate !== undefined) updates.target_hourly_rate = target_hourly_rate;
  if (active !== undefined) updates.active = active;

  const { data, error } = await supabaseAdmin
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return jsonResponse(
      { error: "Could not update client. Please try again." },
      500,
    );
  }

  return jsonResponse({ ok: true, data });
}

// =============================================================
// Alias Handlers
// =============================================================

async function handleCreateAlias(
  payload: Record<string, unknown>,
): Promise<Response> {
  const { client_id, alias } = payload;

  if (!client_id || !alias) {
    return jsonResponse(
      { error: "Client ID and alias are required." },
      400,
    );
  }

  // Alias uniqueness check with client name resolution (D-11)
  const { data: existingAlias } = await supabaseAdmin
    .from("client_aliases")
    .select("id, client_id, client:clients(name)")
    .eq("alias", (alias as string).toUpperCase())
    .limit(1);

  if (existingAlias && existingAlias.length > 0) {
    const clientName =
      (existingAlias[0] as Record<string, unknown>).client &&
      ((existingAlias[0] as Record<string, unknown>).client as Record<string, unknown>)?.name
        ? String(((existingAlias[0] as Record<string, unknown>).client as Record<string, unknown>).name)
        : "another client";
    return jsonResponse(
      { error: `That alias is already assigned to ${clientName}.` },
      409,
    );
  }

  // Verify client exists
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("id", client_id)
    .single();

  if (!client) {
    return jsonResponse({ error: "Client not found." }, 404);
  }

  const { data, error } = await supabaseAdmin
    .from("client_aliases")
    .insert({ client_id, alias: (alias as string).toUpperCase() })
    .select()
    .single();

  if (error) {
    return jsonResponse(
      { error: "Could not create alias. Please try again." },
      500,
    );
  }

  return jsonResponse({ ok: true, data });
}

async function handleDeleteAlias(
  payload: Record<string, unknown>,
): Promise<Response> {
  const { id } = payload;

  if (!id) {
    return jsonResponse({ error: "Alias ID is required." }, 400);
  }

  const { error } = await supabaseAdmin
    .from("client_aliases")
    .delete()
    .eq("id", id);

  if (error) {
    return jsonResponse(
      { error: "Could not delete alias. Please try again." },
      500,
    );
  }

  return jsonResponse({ ok: true });
}

// =============================================================
// Category Handlers
// =============================================================

async function handleCreateCategory(
  payload: Record<string, unknown>,
): Promise<Response> {
  const { name, department, llm_hint } = payload;

  if (!name || !department) {
    return jsonResponse(
      { error: "Category name and department are required." },
      400,
    );
  }

  // Validate department value
  if (!ALLOWED_DEPARTMENTS.includes(department as string)) {
    return jsonResponse(
      {
        error: `Department must be one of: ${ALLOWED_DEPARTMENTS.join(", ")}.`,
      },
      400,
    );
  }

  // Name uniqueness check
  const { data: existing } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("name", name)
    .limit(1);

  if (existing && existing.length > 0) {
    return jsonResponse(
      { error: "A category with that name already exists." },
      409,
    );
  }

  const insertObj: Record<string, unknown> = { name, department };
  if (llm_hint !== undefined) insertObj.llm_hint = llm_hint;

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert(insertObj)
    .select()
    .single();

  if (error) {
    return jsonResponse(
      { error: "Could not create category. Please try again." },
      500,
    );
  }

  return jsonResponse({ ok: true, data });
}

async function handleUpdateCategory(
  payload: Record<string, unknown>,
): Promise<Response> {
  const { id, name, department, llm_hint, active } = payload;

  if (!id) {
    return jsonResponse({ error: "Category ID is required." }, 400);
  }

  // Validate department if provided
  if (department !== undefined && !ALLOWED_DEPARTMENTS.includes(department as string)) {
    return jsonResponse(
      {
        error: `Department must be one of: ${ALLOWED_DEPARTMENTS.join(", ")}.`,
      },
      400,
    );
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (department !== undefined) updates.department = department;
  if (llm_hint !== undefined) updates.llm_hint = llm_hint;
  if (active !== undefined) updates.active = active;

  const { data, error } = await supabaseAdmin
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return jsonResponse(
      { error: "Could not update category. Please try again." },
      500,
    );
  }

  return jsonResponse({ ok: true, data });
}

// =============================================================
// Billing Handlers
// =============================================================

function computeEurEquivalent(
  amount: number,
  currency: string,
  fxRate: number | null,
): number {
  if (currency === "EUR") return amount;
  if (currency === "USD" && fxRate) return amount * fxRate;
  return amount; // Fallback; constraint should prevent invalid combos
}

async function handleCreateBilling(
  payload: Record<string, unknown>,
): Promise<Response> {
  const {
    client_id,
    year_month,
    amount,
    currency,
    fx_rate_to_eur,
    billing_type,
    notes,
    entered_by,
  } = payload;

  if (!client_id || !year_month || amount === undefined || amount === null) {
    return jsonResponse(
      { error: "Client, month, and amount are required." },
      400,
    );
  }

  // Verify client exists
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("id", client_id)
    .single();

  if (!client) {
    return jsonResponse({ error: "Client not found." }, 404);
  }

  const curr = (currency as string) || "EUR";

  // Validate currency
  if (curr !== "EUR" && curr !== "USD") {
    return jsonResponse(
      { error: "Currency must be EUR or USD." },
      400,
    );
  }

  // Validate FX rate for USD
  if (curr === "USD" && !fx_rate_to_eur) {
    return jsonResponse(
      { error: "FX rate to EUR is required for USD billing entries." },
      400,
    );
  }

  const eurEquivalent = computeEurEquivalent(
    amount as number,
    curr,
    fx_rate_to_eur as number | null,
  );

  const { data, error } = await supabaseAdmin
    .from("client_billing")
    .insert({
      client_id,
      year_month,
      amount,
      currency: curr,
      fx_rate_to_eur: fx_rate_to_eur ?? null,
      eur_equivalent: eurEquivalent,
      billing_type: billing_type ?? null,
      notes: notes ?? null,
      entered_by: entered_by ?? null,
    })
    .select()
    .single();

  if (error) {
    // Check for unique constraint violation
    if (error.code === "23505") {
      return jsonResponse(
        { error: "A billing entry already exists for this client and month." },
        409,
      );
    }
    return jsonResponse(
      { error: "Could not create billing entry. Please try again." },
      500,
    );
  }

  return jsonResponse({ ok: true, data });
}

async function handleUpdateBilling(
  payload: Record<string, unknown>,
): Promise<Response> {
  const {
    id,
    client_id,
    year_month,
    amount,
    currency,
    fx_rate_to_eur,
    billing_type,
    notes,
    entered_by,
  } = payload;

  if (!id) {
    return jsonResponse({ error: "Billing entry ID is required." }, 400);
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (client_id !== undefined) updates.client_id = client_id;
  if (year_month !== undefined) updates.year_month = year_month;
  if (amount !== undefined) updates.amount = amount;
  if (currency !== undefined) updates.currency = currency;
  if (fx_rate_to_eur !== undefined) updates.fx_rate_to_eur = fx_rate_to_eur;
  if (billing_type !== undefined) updates.billing_type = billing_type;
  if (notes !== undefined) updates.notes = notes;
  if (entered_by !== undefined) updates.entered_by = entered_by;

  // Recompute eur_equivalent if amount or currency changed
  const finalAmount = (amount ?? null) as number | null;
  const finalCurrency = (currency ?? null) as string | null;
  const finalFxRate = (fx_rate_to_eur ?? null) as number | null;

  if (finalAmount !== null || finalCurrency !== null || finalFxRate !== null) {
    // Fetch current row to fill in missing values
    const { data: current } = await supabaseAdmin
      .from("client_billing")
      .select("amount, currency, fx_rate_to_eur")
      .eq("id", id)
      .single();

    if (current) {
      const amt = finalAmount ?? (current.amount as number);
      const curr = finalCurrency ?? (current.currency as string);
      const fx = finalFxRate ?? (current.fx_rate_to_eur as number | null);

      // Validate currency
      if (curr !== "EUR" && curr !== "USD") {
        return jsonResponse(
          { error: "Currency must be EUR or USD." },
          400,
        );
      }

      // Validate FX rate for USD
      if (curr === "USD" && !fx) {
        return jsonResponse(
          { error: "FX rate to EUR is required for USD billing entries." },
          400,
        );
      }

      updates.eur_equivalent = computeEurEquivalent(amt, curr, fx);
    }
  }

  const { data, error } = await supabaseAdmin
    .from("client_billing")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonResponse(
        { error: "A billing entry already exists for this client and month." },
        409,
      );
    }
    return jsonResponse(
      { error: "Could not update billing entry. Please try again." },
      500,
    );
  }

  return jsonResponse({ ok: true, data });
}

async function handleDeleteBilling(
  payload: Record<string, unknown>,
): Promise<Response> {
  const { id } = payload;

  if (!id) {
    return jsonResponse({ error: "Billing entry ID is required." }, 400);
  }

  const { error } = await supabaseAdmin
    .from("client_billing")
    .delete()
    .eq("id", id);

  if (error) {
    return jsonResponse(
      { error: "Could not delete billing entry. Please try again." },
      500,
    );
  }

  return jsonResponse({ ok: true });
}

// =============================================================
// Override Handler
// =============================================================

async function handleSaveOverride(
  payload: Record<string, unknown>,
): Promise<Response> {
  const { event_id, client_id, category_id, department } = payload;

  // Validate required field
  if (!event_id || typeof event_id !== "string") {
    return jsonResponse({ error: "Event ID is required." }, 400);
  }

  // Validate client_id is a valid string if provided
  if (client_id && typeof client_id !== "string") {
    return jsonResponse({ error: "Invalid client ID." }, 400);
  }

  // Validate category_id is a valid string if provided
  if (category_id && typeof category_id !== "string") {
    return jsonResponse({ error: "Invalid category ID." }, 400);
  }

  // Validate department against allowed values if provided
  if (
    department &&
    !ALLOWED_DEPARTMENTS.includes(department as string)
  ) {
    return jsonResponse(
      {
        error: `Invalid department. Allowed: ${ALLOWED_DEPARTMENTS.join(", ")}`,
      },
      400,
    );
  }

  // Build update payload
  const updateFields: Record<string, unknown> = {
    override_client_id: client_id ?? null,
    override_category_id: category_id ?? null,
    override_department: (department as string) ?? null,
    classification_method: "user_override",
  };

  const { data, error } = await supabaseAdmin
    .from("events")
    .update(updateFields)
    .eq("id", event_id)
    .select()
    .single();

  if (error) {
    return jsonResponse(
      {
        error:
          "Could not save override. Check your connection and try again.",
      },
      500,
    );
  }

  // Log to audit_log for LLM learning (D-24)
  await supabaseAdmin.from("audit_log").insert({
    action: "classification_override",
    entity_type: "event",
    entity_id: event_id as string,
    details: JSON.stringify({
      override_client_id: client_id,
      override_category_id: category_id,
      override_department: department,
    }),
  });

  return jsonResponse({ ok: true, data });
}

// =============================================================
// Trigger Sync Handler
// Routes sync trigger through admin function to keep
// SYNC_SECRET server-side (D-25, Sync Integration Notes).
// =============================================================

async function handleTriggerSync(
  payload: Record<string, unknown>,
): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const syncSecret = Deno.env.get("SYNC_SECRET");

  if (!supabaseUrl || !syncSecret) {
    return jsonResponse(
      { error: "Sync is not configured. Please contact an administrator." },
      500,
    );
  }

  const body: Record<string, unknown> = { trigger: "manual" };
  if (payload.backfill_start) body.backfill_start = payload.backfill_start;
  if (payload.backfill_end) body.backfill_end = payload.backfill_end;

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const syncResponse = await fetch(`${supabaseUrl}/functions/v1/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
        "x-sync-secret": syncSecret,
      },
      body: JSON.stringify(body),
    });

    if (!syncResponse.ok) {
      const errText = await syncResponse.text();
      console.error("Sync trigger failed:", syncResponse.status, errText);
      return jsonResponse(
        { error: `Sync trigger failed (${syncResponse.status}): ${errText}` },
        502,
      );
    }

    const result = await syncResponse.json();
    return jsonResponse({ ok: true, data: result });
  } catch (err) {
    console.error("Sync trigger error:", err);
    return jsonResponse(
      { error: "Could not reach the sync service. Please try again later." },
      502,
    );
  }
}

// =============================================================
// Main Entry Point
// =============================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verify authentication (T-03-01)
  const authError = verifyAuthHash(req);
  if (authError) return authError;

  // Parse request body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const { action, ...payload } = body;

  if (!action || typeof action !== "string") {
    return jsonResponse({ error: "Action is required." }, 400);
  }

  // Route to handler
  switch (action) {
    case "create-switcher":
      return handleCreateSwitcher(payload);
    case "update-switcher":
      return handleUpdateSwitcher(payload);
    case "create-client":
      return handleCreateClient(payload);
    case "update-client":
      return handleUpdateClient(payload);
    case "create-alias":
      return handleCreateAlias(payload);
    case "delete-alias":
      return handleDeleteAlias(payload);
    case "create-category":
      return handleCreateCategory(payload);
    case "update-category":
      return handleUpdateCategory(payload);
    case "create-billing":
      return handleCreateBilling(payload);
    case "update-billing":
      return handleUpdateBilling(payload);
    case "delete-billing":
      return handleDeleteBilling(payload);
    case "save-override":
      return handleSaveOverride(payload);
    case "trigger-sync":
      return handleTriggerSync(payload);
    default:
      return jsonResponse(
        { error: `Unknown action: ${action}` },
        400,
      );
  }
});
