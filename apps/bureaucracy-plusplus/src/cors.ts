import type { Request, Response, NextFunction } from "express";
import { ALLOW_APEX_DOMAIN, DEV_ALLOWED_ORIGINS, ROOT_DOMAIN } from "./config.ts";

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function isAllowedOrigin(origin: string) {
  if (DEV_ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  try {
    const { hostname } = new URL(origin);
    const normalisedHost = hostname.toLowerCase();

    if (isLoopbackHost(normalisedHost)) {
      return true;
    }

    if (!ROOT_DOMAIN) {
      return false;
    }

    if (ALLOW_APEX_DOMAIN && normalisedHost === ROOT_DOMAIN) {
      return true;
    }
    return normalisedHost.endsWith(`.${ROOT_DOMAIN}`);
  } catch {
    return false;
  }
}

export function corsMiddleware(request: Request, response: Response, next: NextFunction) {
  const origin = request.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  next();
}
