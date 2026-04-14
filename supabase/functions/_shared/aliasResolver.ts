// --- Alias Resolver ---
// Resolves client name aliases and detects non-client names.
// Alias data loaded from DB at sync time; this module provides lookup logic.

/**
 * Non-client names that appear in the Client Name field.
 * These are department names, tool names, or placeholders — not actual clients.
 * From instructions.md "Non-Client Names That Appear in the Client Field" section.
 */
const NON_CLIENT_NAMES: Set<string> = new Set([
  "marketing",
  "pm",
  "design",
  "hr",
  "admin",
  "asana",
  "buffer time",
  "bd",
  "tbc",
  "safety time",
  "template design brief",
  "switch",
  "internal",
]);

/**
 * Build a case-insensitive alias lookup Map from DB results.
 * Keys are lowercase alias strings, values are canonical client names.
 *
 * @param aliases - Array of { alias, client_name } records from the database
 * @returns Map with lowercase keys -> canonical client names
 */
export function buildAliasMap(
  aliases: Array<{ alias: string; client_name: string }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const { alias, client_name } of aliases) {
    map.set(alias.toLowerCase().trim(), client_name);
  }
  return map;
}

/**
 * Resolve a raw client name to its canonical form using the alias map.
 * Lookup is case-insensitive.
 *
 * @param clientRaw - The raw client name from the calendar event title
 * @param aliasMap - Map of lowercase aliases to canonical client names
 * @returns Canonical client name if alias found, otherwise the original clientRaw
 */
export function resolveClientAlias(
  clientRaw: string,
  aliasMap: Map<string, string>,
): string {
  if (!clientRaw || clientRaw.trim() === "") {
    return clientRaw;
  }

  const key = clientRaw.toLowerCase().trim();
  const canonical = aliasMap.get(key);

  if (canonical != null) {
    return canonical;
  }

  return clientRaw;
}

/**
 * Check if a name is a non-client name that sometimes appears in the client field.
 * These include department names (Marketing, PM, Design, HR, Admin),
 * tool names (Asana), and placeholders (BD, TBC, SAFETY TIME, Buffer time,
 * Template Design Brief).
 *
 * Note: "Switch" and "Internal" are valid client values in certain contexts
 * (Switch = the agency itself, Internal = internal work), but they are listed
 * here because they are not external client names and may need special handling
 * during classification.
 *
 * @param name - The client name to check
 * @returns true if the name is a non-client name
 */
export function isNonClientName(name: string): boolean {
  if (!name || name.trim() === "") {
    return false;
  }
  return NON_CLIENT_NAMES.has(name.toLowerCase().trim());
}
