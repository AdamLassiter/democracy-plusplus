import { useState } from 'react'
import { Box, Button, CircularProgress, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import Loadout from './loadout';
import Shop from './shop';
import TierLists from './tierList';
import { selectPreferences, setTitles, setTooltips } from '../slices/preferencesSlice';
import { selectCredits } from '../slices/creditsSlice';
import { selectMission } from '../slices/missionSlice';
import ApplicationState from './appState';

export default function Menu() {
  const [currentTab, setCurrentTab] = useState(0);
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const { credits } = useSelector(selectCredits);

  const dispatch = useDispatch();
  const { titles, tooltips } = useSelector(selectPreferences);
  const handleTitlesChange = (event, newValue) => {
    dispatch(setTitles(newValue === 'on'));
  }
  const handleTooltipsChange = (event, newValue) => {
    dispatch(setTooltips(newValue === 'on'));
  };

  const mission = useSelector(selectMission);
  const { prng, count } = mission;
  const [appState, setAppState] = useState(false);
  const handlePrng = () => {
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
          <ToggleButtonGroup
            color="primary"
            exclusive
            value={titles ? 'on' : 'off'}
            onChange={handleTitlesChange}
          >
            <ToggleButton value="on">Titles</ToggleButton>
            <ToggleButton value="off">Hidden</ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            color="primary"
            exclusive
            value={tooltips ? 'on' : 'off'}
            onChange={handleTooltipsChange}
          >
            <ToggleButton value="on">Tooltips</ToggleButton>
            <ToggleButton value="off">Hidden</ToggleButton>
          </ToggleButtonGroup>

          <Button
            sx={{ width: '80px' }}
            variant="outlined"
            onClick={handlePrng}
            startIcon={<CircularProgress size={12} />}
          >
            {prng}
          </Button>
        </Box>
      </Box>

      <Box sx={{ padding: '1em' }}>
        <CurrentTab index={currentTab} />
      </Box>

      {appState && <ApplicationState open={appState} setOpen={setAppState} />}
    </Box>
  );
}
