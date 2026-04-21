import type {
  ClientCommand,
  LobbyCode,
  LobbySessionResponse,
  ServerEvent,
} from "../types";

const DEFAULT_DEV_BACKEND_URL = "http://localhost:8080";
const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL
  ?? (import.meta.env.DEV ? DEFAULT_DEV_BACKEND_URL : "")
)?.replace(/\/+$/, "") ?? "";

function endpoint(path: string) {
  if (!BACKEND_URL) {
    throw new Error("Backend URL is not configured");
  }
  return `${BACKEND_URL}${path}`;
}

export function getBackendUrl() {
  return BACKEND_URL;
}

export async function checkBackendHealth() {
  if (!BACKEND_URL) {
    return false;
  }

  const response = await fetch(endpoint("/health"));
  return response.ok;
}

export async function createLobby(displayName: string): Promise<LobbySessionResponse> {
  return postJson("/api/lobbies", { displayName });
}

export async function joinLobby(lobbyCode: string, displayName: string): Promise<LobbySessionResponse> {
  return postJson(`/api/lobbies/${encodeURIComponent(lobbyCode)}/join`, { displayName });
}

export async function sendLobbyCommand(
  lobbyCode: LobbyCode,
  memberId: string,
  sessionToken: string,
  command: ClientCommand,
) {
  return postJson(`/api/lobbies/${encodeURIComponent(lobbyCode)}/command`, {
    memberId,
    sessionToken,
    command,
  });
}

export function connectLobbyEvents(
  lobbyCode: LobbyCode,
  memberId: string,
  sessionToken: string,
  onEvent: (event: ServerEvent) => void,
  onError: () => void,
) {
  const url = new URL(endpoint(`/api/lobbies/${encodeURIComponent(lobbyCode)}/events`));
  url.searchParams.set("memberId", memberId);
  url.searchParams.set("sessionToken", sessionToken);

  const stream = new EventSource(url);
  stream.onmessage = (message) => {
    const event = JSON.parse(message.data) as ServerEvent;
    onEvent(event);
  };
  stream.onerror = () => {
    onError();
    stream.close();
  };

  return stream;
}

async function postJson(path: string, body: unknown) {
  const response = await fetch(endpoint(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error ?? "Request failed");
  }
  return json;
}
