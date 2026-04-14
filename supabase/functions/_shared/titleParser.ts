// --- Title Parser ---
// Parses pipe-delimited calendar event titles per the Switch convention:
// "Client | Task Details"

export interface ParsedTitle {
  clientRaw: string;
  taskDetails: string;
}

/**
 * Parse a calendar event summary (title) into client name and task details.
 *
 * Rules from instructions.md:
 * - Split on first pipe `|` character
 * - Left side = client name (trimmed), right side = task details (trimmed)
 * - If no pipe, entire title is taskDetails, clientRaw is empty string
 * - If multiple pipes, first split only (rest stays in taskDetails)
 * - Edge case: title is just a pipe character -> both empty
 * - Empty/null title -> both empty
 */
export function parseTitle(summary: string): ParsedTitle {
  if (!summary || summary.trim() === "") {
    return { clientRaw: "", taskDetails: "" };
  }

  const pipeIndex = summary.indexOf("|");

  if (pipeIndex === -1) {
    // No pipe: entire title is task details, no client
    return { clientRaw: "", taskDetails: summary.trim() };
  }

  // Split on first pipe only
  const clientRaw = summary.substring(0, pipeIndex).trim();
  const taskDetails = summary.substring(pipeIndex + 1).trim();

  return { clientRaw, taskDetails };
}
