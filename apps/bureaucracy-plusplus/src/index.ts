import { PORT } from "./config.ts";
import { createApp } from "./createApp.ts";
import { startLobbyCleanupTimer } from "./lobbyStore.ts";
import { logEvent } from "./logger.ts";

const app = createApp();

startLobbyCleanupTimer();

app.listen(PORT, () => {
  logEvent("server.listen", { port: PORT });
});
