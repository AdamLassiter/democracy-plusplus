import { useState } from 'react'
import { Box, Button, CircularProgress, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import Loadout from './loadout';
import Shop from './shop';
import TierLists from './tierList';
import { selectCredits } from '../slices/creditsSlice';
import { selectMission } from '../slices/missionSlice';
import Settings from './settings';
import WarbondsFilter from './warbondsFilter';
import { Settings as SettingsIcon } from '@mui/icons-material';

export default function Menu() {
  const [currentTab, setCurrentTab] = useState(0);
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const { credits } = useSelector(selectCredits);

  const mission = useSelector(selectMission);
  const { prng, count } = mission;
  const [appState, setAppState] = useState(false);
  const handleAppState = () => {
    setAppState(true);
  };

  const tabs = [Loadout, Shop, TierLists];
  const CurrentTab = tabs[currentTab];

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
        </Tabs>

        {/* Credits aligned to the center */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <img src={`${import.meta.env.BASE_URL}/images/icons/medal.svg`} alt="icon" style={{ width: 24, height: 24 }} />
          <Typography>Mission {count}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <img src={`${import.meta.env.BASE_URL}/images/icons/skull-and-crossbones.svg`} alt="icon" style={{ width: 24, height: 24 }} />
          <Typography>Democracy++</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <img src={`${import.meta.env.BASE_URL}/images/icons/dollar-circle.svg`} alt="icon" style={{ width: 24, height: 24 }} />
          <Typography>{credits}¢</Typography>
        </Box>

        {/* Preferences aligned to the right */}
        <Box sx={{ display: 'flex', gap: 1 }}>

          <WarbondsFilter />

          <Button
            sx={{ width: '100px' }}
            variant="outlined"
            onClick={handleAppState}
          >
            <SettingsIcon />
            &nbsp;
            {prng}
          </Button>
        </Box>
      </Box>

      <Box sx={{ padding: '1em' }}>
        <CurrentTab index={currentTab} />
      </Box>

      {appState && <Settings open={appState} setOpen={setAppState} />}
    </Box>
  );
}
