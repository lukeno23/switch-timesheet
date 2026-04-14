// --- Output Validator ---
// Validates LLM classification output against canonical client, category,
// and department lists. Ensures no hallucinated or invalid values are
// written to the database (T-02-08, D-10, CLAS-03).

/**
 * Result of validating a single classification row.
 */
export interface ValidationResult {
  valid: boolean;
  client_name: string;
  category: string;
  department: string;
  issues: string[];
}

/**
 * Validate an array of LLM classification results against known-valid sets
 * of clients, categories, and departments. Each result is checked
 * independently. Invalid values are flagged with descriptive issues.
 *
 * Comparison is case-insensitive: the LLM may return slightly different
 * casing, but the canonical value from the valid set is used in the output.
 *
 * @param results - Array of classification results from the LLM
 * @param validClients - Set of canonical client names (case-insensitive lookup)
 * @param validCategories - Set of canonical category names
 * @param validDepartments - Set of canonical department names
 * @returns Array of ValidationResult with valid flag and any issues
 */
export function validateClassifications(
  results: Array<{
    row: number;
    client: string;
    category: string;
    department: string;
  }>,
  validClients: Set<string>,
  validCategories: Set<string>,
  validDepartments: Set<string>,
): Array<ValidationResult> {
  // Build lowercase lookup maps to canonical values
  const clientLookup = new Map<string, string>();
  for (const c of validClients) {
    clientLookup.set(c.toLowerCase(), c);
  }

  const categoryLookup = new Map<string, string>();
  for (const c of validCategories) {
    categoryLookup.set(c.toLowerCase(), c);
  }

  const departmentLookup = new Map<string, string>();
  for (const d of validDepartments) {
    departmentLookup.set(d.toLowerCase(), d);
  }

  return results.map((result) => {
    const issues: string[] = [];

    // Validate client (case-insensitive)
    const clientKey = result.client.toLowerCase().trim();
    const canonicalClient = clientLookup.get(clientKey);
    if (!canonicalClient) {
      issues.push(`unknown client: ${result.client}`);
    }

    // Validate category (case-insensitive)
    const categoryKey = result.category.toLowerCase().trim();
    const canonicalCategory = categoryLookup.get(categoryKey);
    if (!canonicalCategory) {
      issues.push(`unknown category: ${result.category}`);
    }

    // Validate department (case-insensitive)
    const departmentKey = result.department.toLowerCase().trim();
    const canonicalDepartment = departmentLookup.get(departmentKey);
    if (!canonicalDepartment) {
      issues.push(`unknown department: ${result.department}`);
    }

    return {
      valid: issues.length === 0,
      client_name: canonicalClient ?? result.client,
      category: canonicalCategory ?? result.category,
      department: canonicalDepartment ?? result.department,
      issues,
    };
  });
}
