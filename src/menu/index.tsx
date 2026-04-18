import type { SyntheticEvent } from 'react';
import { useEffect, useRef, useState } from 'react'
import { Box, IconButton, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import Loadout from './loadout';
import Shop from './shop';
import TierLists from './tierList';
import Log from './log';
import { selectCredits } from '../slices/creditsSlice';
import { selectMission } from '../slices/missionSlice';
import Settings from './settings';
import WarbondsFilter from './warbonds';
import Help from './help';
import type { ReactElement } from 'react';
import StratagemGame from './stratagemGame';

const KONAMI_SEQUENCE = ["Up", "Up", "Down", "Down", "Left", "Right", "Left", "Right"] as const;

function shouldIgnoreUnlockTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA";
}

function normalizeUnlockKey(key: string) {
  const keyMap = {
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
  } as const;

  return keyMap[key as keyof typeof keyMap] ?? null;
}

type MenuTabProps = {
  index: number;
};

export default function Menu() {
  const [currentTab, setCurrentTab] = useState(0);
  const [isStratagemGameUnlocked, setIsStratagemGameUnlocked] = useState(false);
  const [isStratagemGameOpen, setIsStratagemGameOpen] = useState(false);
  const sequenceIndexRef = useRef(0);
  const lastKeyTimeRef = useRef(0);

  function handleTabChange(_event: SyntheticEvent, newValue: number) {
    setCurrentTab(newValue);
  }

  const { credits } = useSelector(selectCredits);

  const mission = useSelector(selectMission);
  const { mission: missionNumber } = mission;

  const tabs: Array<(props: MenuTabProps) => ReactElement> = [Loadout, Shop, TierLists, Log];
  const CurrentTab = tabs[currentTab];

  useEffect(() => {
    if (isStratagemGameOpen) {
      sequenceIndexRef.current = 0;
      lastKeyTimeRef.current = 0;
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat || shouldIgnoreUnlockTarget(event.target)) {
        return;
      }

      const input = normalizeUnlockKey(event.key);
      if (!input) {
        return;
      }

      const now = Date.now();
      const timedOut = sequenceIndexRef.current > 0 && now - lastKeyTimeRef.current > 1000;
      if (timedOut) {
        sequenceIndexRef.current = 0;
      }

      const expected = KONAMI_SEQUENCE[sequenceIndexRef.current];
      if (input === expected) {
        sequenceIndexRef.current += 1;
        lastKeyTimeRef.current = now;

        if (sequenceIndexRef.current === KONAMI_SEQUENCE.length) {
          setIsStratagemGameUnlocked(true);
          sequenceIndexRef.current = 0;
          lastKeyTimeRef.current = 0;
        }
        return;
      }

      sequenceIndexRef.current = input === KONAMI_SEQUENCE[0] ? 1 : 0;
      lastKeyTimeRef.current = sequenceIndexRef.current ? now : 0;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStratagemGameOpen]);

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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <img src={`${import.meta.env.BASE_URL}images/icons/medal.svg`} alt="icon" style={{ width: 24, height: 24 }} />
          <Typography>Mission {missionNumber}</Typography>
        </Box>
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
          <WarbondsFilter />
          <Settings />
          <Help />
        </Box>
      </Box>

      <Box sx={{ padding: '1em' }}>
        <CurrentTab index={currentTab} />
      </Box>
      <StratagemGame open={isStratagemGameOpen} onClose={() => setIsStratagemGameOpen(false)} />
    </Box>
  );
}
