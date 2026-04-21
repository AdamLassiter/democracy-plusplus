import express from "express";
import type { ClientCommand } from "@plusplus/shared-types";
import { corsMiddleware } from "./cors.ts";
import { logEvent } from "./logger.ts";
import {
  attachEventStream,
  authenticate,
  createLobby,
  handleCommand,
  joinLobby,
  normaliseDisplayName,
  pollLobbyPresence,
} from "./lobbyStore.ts";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(corsMiddleware);

  app.get("/health", (_request, response) => {
    logEvent("health.check");
    response.json({ ok: true });
  });

  app.post("/api/lobbies", (request, response) => {
    const displayName = normaliseDisplayName(request.body?.displayName);
    if (!displayName) {
      logEvent("lobby.create.rejected", { reason: "missing_display_name" });
      response.status(400).json({ error: "displayName is required" });
      return;
    }

    response.json(createLobby(displayName));
  });

  app.post("/api/lobbies/:code/join", (request, response) => {
    const displayName = normaliseDisplayName(request.body?.displayName);
    if (!displayName) {
      logEvent("lobby.join.rejected", {
        lobbyCode: request.params.code,
        reason: "missing_display_name",
      });
      response.status(400).json({ error: "displayName is required" });
      return;
    }

    const payload = joinLobby(request.params.code, displayName);
    if (!payload) {
      logEvent("lobby.join.rejected", {
        lobbyCode: request.params.code,
        displayName,
        reason: "not_found",
      });
      response.status(404).json({ error: "Lobby not found" });
      return;
    }

    response.json(payload);
  });

  app.get("/api/lobbies/:code/events", (request, response) => {
    const auth = authenticate(request.params.code, request.query.memberId, request.query.sessionToken);
    if (!auth) {
      logEvent("lobby.events.rejected", {
        lobbyCode: request.params.code,
        reason: "unauthorized",
      });
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    attachEventStream(auth.lobby, auth.session, request, response);
  });

  app.post("/api/lobbies/:code/command", (request, response) => {
    const auth = authenticate(
      request.params.code,
      request.body?.memberId,
      request.body?.sessionToken,
    );
    if (!auth) {
      logEvent("lobby.command.rejected", {
        lobbyCode: request.params.code,
        reason: "unauthorized",
      });
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    const command = request.body?.command as ClientCommand | undefined;
    if (!command || typeof command.type !== "string") {
      logEvent("lobby.command.rejected", {
        lobbyCode: request.params.code,
        memberId: auth.session.memberId,
        reason: "missing_command",
      });
      response.status(400).json({ error: "command is required" });
      return;
    }

    try {
      const lobbyState = handleCommand(auth.lobby, auth.session, command);
      response.json({ ok: true, lobbyState });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Command failed";
      const status = message === "Member not found" ? 404 : 400;
      logEvent("lobby.command.failed", {
        lobbyCode: request.params.code,
        memberId: auth.session.memberId,
        commandType: command.type,
        error: message,
      });
      response.status(status).json({ error: message });
    }
  });

  app.post("/api/lobbies/:code/poll", (request, response) => {
    const auth = authenticate(
      request.params.code,
      request.body?.memberId,
      request.body?.sessionToken,
    );
    if (!auth) {
      logEvent("lobby.poll.rejected", {
        lobbyCode: request.params.code,
        reason: "unauthorized",
      });
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    const lobbyState = pollLobbyPresence(auth.lobby, auth.session);
    response.json({ ok: true, lobbyState });
  });

  return app;
}
