import type { SyntheticEvent } from 'react';
import { useEffect, useRef, useState } from 'react'
import { Alert, Box, ButtonBase, IconButton, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import Loadout from './loadout';
import Shop from './shop';
import TierLists from './tierList';
import Log from './log';
import { selectCredits } from '../slices/creditsSlice';
import { selectMission } from '../slices/missionSlice';
import { selectPreferences, setMissionFlowBanner } from '../slices/preferencesSlice';
import Settings from './settings';
import WarbondsFilter from './warbonds';
import Help from './help';
import type { ReactElement } from 'react';
import StratagemGame from './minigames/stratagemGame';
import AchievementsDialog from './achievements';
import FormsGame from './minigames/formsGame';
import { nextSecretSequenceIndex, normalizeArrowKey, shouldIgnoreSecretTarget } from '../utils/secretCode';

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
  const stratagemSequenceIndexRef = useRef(0);
  const stratagemLastKeyTimeRef = useRef(0);
  const formsSequenceIndexRef = useRef(0);
  const formsLastKeyTimeRef = useRef(0);

  function handleTabChange(_event: SyntheticEvent, newValue: number) {
    setCurrentTab(newValue);
  }

  const { credits } = useSelector(selectCredits);
  const mission = useSelector(selectMission);
  const { missionFlowBanner } = useSelector(selectPreferences);
  const { count: missionCount } = mission;
  const nextStepText = mission.state === 'brief'
    ? "Choose a faction, difficulty, and objective, then lock in to reveal the mission conditions."
    : mission.state === 'loadout'
      ? "Review the assignments, use the shop and inventory to assemble your loadout, then deploy into the mission."
      : "After playing the mission in-game, submit the mission report with the final results.";

  const tabs: Array<(props: MenuTabProps) => ReactElement> = [Loadout, Shop, TierLists, Log];
  const CurrentTab = tabs[currentTab];

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

      <Box sx={{ padding: '1em' }}>
        <CurrentTab index={currentTab} />
      </Box>
      <AchievementsDialog open={isAchievementsOpen} onClose={() => setIsAchievementsOpen(false)} />
      <FormsGame open={isFormsGameOpen} onClose={() => setIsFormsGameOpen(false)} />
      <StratagemGame open={isStratagemGameOpen} onClose={() => setIsStratagemGameOpen(false)} />
    </Box>
  );
}
