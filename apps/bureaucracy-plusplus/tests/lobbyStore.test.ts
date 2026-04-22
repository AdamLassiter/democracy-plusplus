import test, { afterEach, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
  authenticate,
  cleanupExpiredLobbies,
  createLobby,
  handleCommand,
  joinLobby,
  pollLobbyPresence,
  resetLobbyStoreForTests,
} from "../src/lobbyStore.ts";

beforeEach(() => {
  resetLobbyStoreForTests();
  mock.restoreAll();
  mock.method(console, "log", () => {});
});

afterEach(() => {
  resetLobbyStoreForTests();
  mock.restoreAll();
});

test("createLobby returns a host member with an initial snapshot", () => {
  const session = createLobby("Host Player");

  assert.equal(session.lobbyCode, session.lobbyState.lobbyCode);
  assert.equal(session.lobbyState.hostMemberId, session.memberId);
  assert.equal(session.lobbyState.members.length, 1);
  assert.equal(session.lobbyState.members[0]?.displayName, "Host Player");
  assert.equal(session.lobbyState.members[0]?.isHost, true);
});

test("joinLobby adds a non-host member to an existing lobby", () => {
  const host = createLobby("Host");
  const guest = joinLobby(host.lobbyCode, "Guest");

  assert.ok(guest);
  assert.equal(guest.lobbyState.members.length, 2);
  assert.equal(guest.lobbyState.hostMemberId, host.memberId);
  const joinedGuest = guest.lobbyState.members.find((member) => member.memberId === guest.memberId);
  assert.equal(joinedGuest?.displayName, "Guest");
  assert.equal(joinedGuest?.isHost, false);
});

test("authenticate rejects invalid session tokens", () => {
  const host = createLobby("Host");

  const auth = authenticate(host.lobbyCode, host.memberId, "bad-token");

  assert.equal(auth, null);
});

test("pollLobbyPresence returns the latest lobby snapshot for an authenticated member", () => {
  const host = createLobby("Host");
  joinLobby(host.lobbyCode, "Guest");
  const auth = authenticate(host.lobbyCode, host.memberId, host.sessionToken);

  assert.ok(auth);
  const lobbyState = pollLobbyPresence(auth.lobby, auth.session);

  assert.equal(lobbyState.members.length, 2);
  assert.equal(lobbyState.hostMemberId, host.memberId);
});

test("non-host members cannot update mission config", () => {
  const host = createLobby("Host");
  const guest = joinLobby(host.lobbyCode, "Guest");

  assert.ok(guest);
  const auth = authenticate(host.lobbyCode, guest.memberId, guest.sessionToken);

  assert.ok(auth);
  assert.throws(
    () => handleCommand(auth.lobby, auth.session, {
      type: "setMissionConfig",
      mission: { difficulty: 4 },
    }),
    /Only the host can perform this action/,
  );
});

test("leaveLobby promotes another member to host", () => {
  const host = createLobby("Host");
  const guest = joinLobby(host.lobbyCode, "Guest");

  assert.ok(guest);
  const hostAuth = authenticate(host.lobbyCode, host.memberId, host.sessionToken);

  assert.ok(hostAuth);
  const lobbyState = handleCommand(hostAuth.lobby, hostAuth.session, { type: "leaveLobby" });

  assert.equal(lobbyState.members.length, 1);
  assert.equal(lobbyState.hostMemberId, guest.memberId);
  assert.equal(lobbyState.members[0]?.memberId, guest.memberId);
  assert.equal(lobbyState.members[0]?.isHost, true);
});

test("cleanupExpiredLobbies removes inactive members and promotes the next host", () => {
  const now = 1_000_000;
  mock.method(Date, "now", () => now);
  const host = createLobby("Host");
  const guest = joinLobby(host.lobbyCode, "Guest");

  assert.ok(guest);
  const hostAuth = authenticate(host.lobbyCode, host.memberId, host.sessionToken);
  const guestAuth = authenticate(host.lobbyCode, guest.memberId, guest.sessionToken);

  assert.ok(hostAuth);
  assert.ok(guestAuth);

  hostAuth.session.lastSeenAt = now - 31_000;
  guestAuth.session.lastSeenAt = now;

  cleanupExpiredLobbies();

  const updatedGuestAuth = authenticate(host.lobbyCode, guest.memberId, guest.sessionToken);

  assert.ok(updatedGuestAuth);
  const lobbyState = updatedGuestAuth.lobby ? pollLobbyPresence(updatedGuestAuth.lobby, updatedGuestAuth.session) : null;
  assert.ok(lobbyState);
  assert.equal(lobbyState.members.length, 1);
  assert.equal(lobbyState.hostMemberId, guest.memberId);
  assert.equal(lobbyState.members[0]?.isHost, true);
});
