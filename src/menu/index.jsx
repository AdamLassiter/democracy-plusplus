import { useState } from 'react'
import { Box, Tab, Tabs } from '@mui/material';
import Loadout from './loadout';
import Shop from './shop';
import TierLists from './tierList';

export default function Menu() {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const tabs = [Loadout, Shop, TierLists];
  const CurrentTab = tabs[value];

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          <Tab label="Loadout" />
          <Tab label="Shop" />
          <Tab label="Tier List" />
        </Tabs>
      </Box>
      <Box sx={{ padding: '1em' }}>
        <CurrentTab index={value} />
      </Box>
    </Box>
  );
}
