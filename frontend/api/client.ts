import type { Client, Language } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// Shape returned by the backend (ClientOut schema, snake_case).
interface ClientResponse {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  display_number: number;
  display_label: string;
  preferred_language: Language;
  created_at: string;
}

function mapClient(raw: ClientResponse): Client {
  return {
    id: raw.id,
    firstName: raw.first_name,
    lastName: raw.last_name,
    phoneNumber: raw.phone_number,
    displayNumber: raw.display_number,
    displayLabel: raw.display_label,
    preferredLanguage: raw.preferred_language,
    createdAt: raw.created_at,
  };
}

/**
 * POST /clients
 * Creates an empty client record (zero friction, no fields required).
 * The backend auto-increments displayNumber and computes displayLabel
 * ("Client 001" until a name is set via PATCH /clients/{id}).
 */
export async function postCreateClient(): Promise<Client> {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Échec de la création du client (${response.status})`);
  }

  const raw: ClientResponse = await response.json();
  return mapClient(raw);
}