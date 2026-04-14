// --- Google Calendar API Auth ---
// Manual JWT signing using Deno Web Crypto API for Google service account
// impersonation. Avoids google-auth-library npm compatibility issues
// (Research Pitfall 1). Uses domain-wide delegation to impersonate Switchers.

/**
 * Base64url-encode a string (JWT-safe: replaces +/= with -/_ and strips padding).
 */
function base64urlEncode(data: string): string {
  return btoa(data)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Base64url-encode a Uint8Array (for signature bytes).
 */
function base64urlEncodeBytes(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Get a Google OAuth2 access token by signing a JWT with the service account
 * private key and exchanging it at the Google token endpoint.
 *
 * Uses domain-wide delegation (sub claim) to impersonate a specific user,
 * enabling calendar access for any Switcher.
 *
 * @param serviceAccountJson - JSON string of the Google service account key file
 * @param userEmail - Email address of the Switcher to impersonate
 * @returns OAuth2 access token string
 * @throws Error if key import, signing, or token exchange fails
 */
export async function getGoogleAccessToken(
  serviceAccountJson: string,
  userEmail: string,
): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  // --- Build JWT header ---
  const header = base64urlEncode(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  );

  // --- Build JWT claims ---
  const claims = base64urlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
      sub: userEmail, // domain-wide delegation: impersonate this Switcher
    }),
  );

  const signingInput = `${header}.${claims}`;

  // --- Import RSA private key (PKCS#8 PEM -> CryptoKey) ---
  // Strip PEM headers and newlines to get raw base64-encoded DER bytes
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "")
    .replace(/\r/g, "");

  const keyData = Uint8Array.from(atob(pemBody), (c: string) =>
    c.charCodeAt(0),
  );

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // --- Sign the JWT ---
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const signature = base64urlEncodeBytes(new Uint8Array(signatureBuffer));
  const jwt = `${signingInput}.${signature}`;

  // --- Exchange JWT for access token ---
  // T-02-06: Service account JSON is read from Deno.env.get by the caller
  // (sync orchestrator), never logged or returned in responses.
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResp.ok) {
    const errorBody = await tokenResp.text();
    throw new Error(
      `Google token exchange failed (${tokenResp.status}): ${errorBody}`,
    );
  }

  const tokenData = await tokenResp.json();

  if (!tokenData.access_token) {
    throw new Error(
      `Google token response missing access_token: ${JSON.stringify(tokenData)}`,
    );
  }

  return tokenData.access_token;
}
