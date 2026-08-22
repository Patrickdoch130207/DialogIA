const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

interface TokenResponse {
  access_token: string;
  token_type: string;
}

/**
 * POST /auth/login
 * Step 1 — shared agent account. Backend expects OAuth2PasswordRequestForm,
 * i.e. a form-urlencoded body (username/password), not JSON.
 */
export async function loginAgent(username: string, password: string): Promise<string> {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? "Identifiants invalides" : `Échec de connexion (${response.status})`);
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}

/**
 * POST /auth/operator-login
 * Step 2 — personal PIN, nested inside a valid agent session (Authorization header required).
 */
export async function loginOperator(
  agentToken: string,
  displayName: string,
  pin: string
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/operator-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${agentToken}`,
    },
    body: JSON.stringify({ display_name: displayName, pin }),
  });

  if (!response.ok) {
    if (response.status === 423) throw new Error("Trop de tentatives, réessayez plus tard");
    if (response.status === 401) throw new Error("PIN incorrect");
    if (response.status === 404) throw new Error("Opérateur introuvable");
    throw new Error(`Échec de connexion (${response.status})`);
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}