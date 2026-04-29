import type { ReactElement, SyntheticEvent } from 'react';
import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, ButtonBase, IconButton, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import Loadout from './loadout';
import Shop from './shop';
import TierLists from './tierList';
import Log from './log';
import { selectCredits } from '../slices/creditsSlice';
import { selectMission } from '../slices/missionSlice';
import { selectPreferences, setMissionFlowBanner } from '../slices/preferencesSlice';
import { createLobby, joinLobby, sendLobbyCommand } from '../multiplayer/api';
import MultiplayerManager from '../multiplayer/manager';
import Settings from './settings';
import WarbondsFilter from './warbonds';
import Help from './help';
import StratagemGame from './minigames/stratagemGame';
import AchievementsDialog from './achievements';
import FormsGame from './minigames/formsGame';
import { nextSecretSequenceIndex, normalizeArrowKey, shouldIgnoreSecretTarget } from '../utils/secretCode';
import { resetLobbySession, selectMultiplayer, setConnecting, setConnectionError, setDisplayName, setLobbySession } from '../slices/multiplayerSlice';
import LobbyPanel from '../multiplayer/lobbyPanel';
import { HostLobby, JoinLobby } from './lobby';

const KONAMI_SEQUENCE = ["Up", "Up", "Down", "Down", "Left", "Right", "Left", "Right"] as const;
const FORMS_SEQUENCE = ["Up", "Right", "Down", "Down", "Down", "Down", "Down", "Down"] as const;

type MenuTabProps = {
  index: number;
};

export default function Menu() {
  const dispatch = useDispatch();
  const [currentTab, setCurrentTab] = useState(0);
  const [isStratagemGameUnlocked, setIsStratagemGameUnlocked] = useState(false);
  const [isStratagemGameOpen, setIsStratagemGameOpen] = useState(false);
  const [isFormsGameUnlocked, setIsFormsGameUnlocked] = useState(false);
  const [isFormsGameOpen, setIsFormsGameOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isHostDialogOpen, setIsHostDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const stratagemSequenceIndexRef = useRef(0);
  const stratagemLastKeyTimeRef = useRef(0);
  const formsSequenceIndexRef = useRef(0);
  const formsLastKeyTimeRef = useRef(0);

  function handleTabChange(_event: SyntheticEvent, newValue: number) {
    setCurrentTab(newValue);
  }

  const { credits } = useSelector(selectCredits);
  const mission = useSelector(selectMission);
  const multiplayer = useSelector(selectMultiplayer);
  const { missionFlowBanner } = useSelector(selectPreferences);
  const { count: missionCount } = mission;
  const nextStepText = mission.state === 'brief'
    ? "Choose a faction, difficulty, and objective, then lock in to reveal the mission requirements."
    : mission.state === 'loadout'
      ? "Review the assignments, use the shop and inventory to assemble your loadout, then deploy into the mission."
      : "After playing the mission in-game, submit the mission report with the final results.";

  const tabs: Array<(_props: MenuTabProps) => ReactElement> = [Loadout, Shop, TierLists, Log];
  const CurrentTab = tabs[currentTab];
  const multiplayerEnabled = multiplayer.backendAvailable;
  const lobbyConnected = multiplayer.connectionStatus === "connected" && Boolean(multiplayer.lobbyState);

  async function handleCreateLobby() {
    try {
      dispatch(setConnecting());
      const session = await createLobby(displayNameInput);
      dispatch(setDisplayName(displayNameInput));
      dispatch(setLobbySession(session));
      setIsHostDialogOpen(false);
      setDisplayNameInput("");
    } catch (error) {
      dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to host lobby"));
    }
  }

  async function handleJoinLobby() {
    try {
      dispatch(setConnecting());
      const session = await joinLobby(joinCodeInput, displayNameInput);
      dispatch(setDisplayName(displayNameInput));
      dispatch(setLobbySession(session));
      setIsJoinDialogOpen(false);
      setDisplayNameInput("");
      setJoinCodeInput("");
    } catch (error) {
      dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to join lobby"));
    }
  }

  async function handleLeaveLobby() {
    if (multiplayer.lobbyCode && multiplayer.memberId && multiplayer.sessionToken) {
      try {
        await sendLobbyCommand(multiplayer.lobbyCode, multiplayer.memberId, multiplayer.sessionToken, {
          type: "leaveLobby",
        });
      } catch {
        // Intentionally ignore leave failures; local reset is enough for v1.
      }
    }
    dispatch(resetLobbySession());
  }

  useEffect(() => {
    if (isStratagemGameOpen || isFormsGameOpen) {
      stratagemSequenceIndexRef.current = 0;
      stratagemLastKeyTimeRef.current = 0;
      formsSequenceIndexRef.current = 0;
      formsLastKeyTimeRef.current = 0;
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat || shouldIgnoreSecretTarget(event.target)) {
        return;
      }

      const input = normalizeArrowKey(event.key);
      if (!input) {
        return;
      }

      const now = Date.now();
      const stratagemState = nextSecretSequenceIndex(
        input,
        KONAMI_SEQUENCE,
        stratagemSequenceIndexRef.current,
        stratagemLastKeyTimeRef.current,
        now,
        1000,
      );
      stratagemSequenceIndexRef.current = stratagemState.index;
      stratagemLastKeyTimeRef.current = stratagemState.lastKeyTime;
      if (stratagemState.completed) {
        setIsStratagemGameUnlocked(true);
        stratagemSequenceIndexRef.current = 0;
        stratagemLastKeyTimeRef.current = 0;
      }

      const formsState = nextSecretSequenceIndex(
        input,
        FORMS_SEQUENCE,
        formsSequenceIndexRef.current,
        formsLastKeyTimeRef.current,
        now,
        1000,
      );
      formsSequenceIndexRef.current = formsState.index;
      formsLastKeyTimeRef.current = formsState.lastKeyTime;
      if (formsState.completed) {
        setIsFormsGameUnlocked(true);
        formsSequenceIndexRef.current = 0;
        formsLastKeyTimeRef.current = 0;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFormsGameOpen, isStratagemGameOpen]);

  return (
    <Box sx={{ width: '100%' }}>
      <MultiplayerManager />
      <LobbyPanel />
      {/* Flex container for Tabs and ToggleButtons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
          flexWrap: 'wrap',
        }}
      >
        {/* Tabs aligned to the left */}
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Loadout" />
          <Tab label="Shop" />
          <Tab label="Tier List" />
          <Tab label="Log" />
        </Tabs>

        {/* Credits aligned to the center */}
        <ButtonBase
          onClick={() => setIsAchievementsOpen(true)}
          sx={{ borderRadius: 1, display: 'flex', gap: 1, px: 1, py: 0.5 }}
        >
          <img src={`${import.meta.env.BASE_URL}images/icons/medal.svg`} alt="icon" style={{ width: 24, height: 24 }} />
          <Tooltip title="Achievements">
            <Typography>Mission {missionCount}</Typography>
          </Tooltip>
        </ButtonBase>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <img src={`${import.meta.env.BASE_URL}images/icons/skull-and-crossbones.svg`} alt="icon" style={{ width: 24, height: 24 }} />
          <Typography>Democracy++</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <img src={`${import.meta.env.BASE_URL}images/icons/dollar-circle.svg`} alt="icon" style={{ width: 24, height: 24 }} />
          <Typography>{credits}¢</Typography>
        </Box>

        {/* Preferences aligned to the right */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!multiplayerEnabled && (
            <>
              <Button disabled variant="outlined">
                Server Unavailable
              </Button>
            </>
          )}
          {multiplayerEnabled && !lobbyConnected && (
            <>
              <Button color="success" onClick={() => setIsHostDialogOpen(true)} variant="outlined">
                Host Lobby
              </Button>
              <Button color="info" onClick={() => setIsJoinDialogOpen(true)} variant="outlined">
                Join Lobby
              </Button>
            </>
          )}
          {lobbyConnected && (
            <>
              <Button color="error" onClick={handleLeaveLobby} variant="outlined">
                Leave Lobby
              </Button>
            </>
          )}
          {isStratagemGameUnlocked && <Tooltip title="Stratagem Drill">
            <IconButton color="primary" onClick={() => setIsStratagemGameOpen(true)}>
              <img src={`${import.meta.env.BASE_URL}images/icons/stopwatch.svg`} alt="Stratagem Drill" style={{ width: 24, height: 24 }} />
            </IconButton>
          </Tooltip>}
          {isFormsGameUnlocked && <Tooltip title="Bureaucratic Forms">
            <IconButton color="primary" onClick={() => setIsFormsGameOpen(true)}>
              <img src={`${import.meta.env.BASE_URL}images/icons/file-check.svg`} alt="Bureaucratic Forms" style={{ width: 24, height: 24 }} />
            </IconButton>
          </Tooltip>}
          <WarbondsFilter />
          <Settings />
          <Help />
        </Box>
      </Box>
      {missionFlowBanner && (
        <Alert
          severity="info"
          onClose={() => dispatch(setMissionFlowBanner(false))}
          sx={{ borderRadius: 0 }}
        >
          {nextStepText}
        </Alert>
      )}
      {multiplayer.availabilityChecked && !multiplayerEnabled && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          Backend unavailable. Multiplayer lobby features are disabled and the app is running in single-player mode.
        </Alert>
      )}
      {multiplayer.error && (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          {multiplayer.error}
        </Alert>
      )}

      <Box sx={{ padding: '1em' }}>
        <CurrentTab index={currentTab} />
      </Box>
      <AchievementsDialog open={isAchievementsOpen} onClose={() => setIsAchievementsOpen(false)} />
      <FormsGame open={isFormsGameOpen} onClose={() => setIsFormsGameOpen(false)} />
      <StratagemGame open={isStratagemGameOpen} onClose={() => setIsStratagemGameOpen(false)} />
      <HostLobby isHostDialogOpen={isHostDialogOpen} setIsHostDialogOpen={setIsHostDialogOpen} setDisplayNameInput={setDisplayNameInput} displayNameInput={displayNameInput} handleCreateLobby={handleCreateLobby} />
      <JoinLobby isJoinDialogOpen={isJoinDialogOpen} setIsJoinDialogOpen={setIsJoinDialogOpen} setDisplayNameInput={setDisplayNameInput} displayNameInput={displayNameInput} setJoinCodeInput={setJoinCodeInput} joinCodeInput={joinCodeInput} handleJoinLobby={handleJoinLobby} />
    </Box>
  );
}