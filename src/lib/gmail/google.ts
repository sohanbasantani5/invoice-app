import "server-only";

/** The ONLY scope we ask for: create drafts. It cannot read mail. */
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.compose";

export class GmailError extends Error {
  constructor(
    message: string,
    /** true when the user has to connect again (token revoked / expired). */
    readonly reconnect = false,
  ) {
    super(message);
  }
}

/** Env values pasted into a dashboard often carry a stray space or newline. */
const env = (k: string) => (process.env[k] ?? "").trim();

export const gmailConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GMAIL_TOKEN_KEY);
export const redirectUri = (origin: string) => `${origin}/api/gmail/callback`;

export function authUrl(origin: string, state: string, loginHint?: string | null) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline", // gives us a refresh token
    prompt: "consent", // ...every time, so reconnecting always returns one
    include_granted_scopes: "false",
    state,
    ...(loginHint ? { login_hint: loginHint } : {}),
  }).toString();
  return u.toString();
}

async function tokenCall(params: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), ...params }),
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; scope?: string; error?: string };
  if (!r.ok || !j.access_token) throw new GmailError(j.error ?? `token ${r.status}`, j.error === "invalid_grant");
  return j;
}

export const exchangeCode = (origin: string, code: string) =>
  tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirectUri(origin) });

export const refreshAccessToken = async (refreshToken: string) =>
  (await tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken })).access_token!;

async function gmail<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });
  const j = (await r.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!r.ok) throw new GmailError(j.error?.message ?? `gmail ${r.status}`, r.status === 401);
  return j;
}

export async function gmailAddress(accessToken: string): Promise<string> {
  return (await gmail<{ emailAddress: string }>(accessToken, "profile")).emailAddress;
}

/** users.drafts.create. Returns the draft message id, which Gmail uses to open it. */
export async function createDraft(accessToken: string, rawBase64Url: string) {
  const j = await gmail<{ id: string; message: { id: string } }>(accessToken, "drafts", {
    method: "POST",
    body: JSON.stringify({ message: { raw: rawBase64Url } }),
  });
  return { draftId: j.id, messageId: j.message.id };
}

export async function revokeToken(token: string) {
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => {});
}
