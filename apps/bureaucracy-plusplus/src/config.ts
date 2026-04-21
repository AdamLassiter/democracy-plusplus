export const PORT = Number(process.env.PORT ?? 8080);
export const ROOT_DOMAIN = process.env.ROOT_DOMAIN?.trim().toLowerCase() ?? "";
export const ALLOW_APEX_DOMAIN = process.env.ALLOW_APEX_DOMAIN === "true";
export const DEV_ALLOWED_ORIGINS = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
export const EMPTY_LOBBY_TTL_MS = Number(process.env.EMPTY_LOBBY_TTL_MS ?? 1000 * 60 * 15);
export const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 1000 * 60 * 60 * 4);
