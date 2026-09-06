import { Grid, ToggleButtonGroup, ToggleButton, FormLabel } from "@mui/material";
import type { MouseEvent } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectPreferences,
  setDetailedAntiTank,
  setTitles,
  setTooltips,
} from "../../slices/preferencesSlice";

export default function Preferences() {
  const dispatch = useDispatch();

  const { detailedAntiTank, titles, tooltips } = useSelector(selectPreferences);
  function handleTitlesChange(_event: MouseEvent<HTMLElement>, newValue: string | null) {
    dispatch(setTitles(newValue === 'on'));
  }
  function handleTooltipsChange(_event: MouseEvent<HTMLElement>, newValue: string | null) {
    dispatch(setTooltips(newValue === 'on'));
  }
  function handleDetailedAntiTankChange(_event: MouseEvent<HTMLElement>, newValue: string | null) {
    if (newValue !== null) {
      dispatch(setDetailedAntiTank(newValue === 'on'));
    }
  }

  return (
    <Grid container direction="column" spacing={2}>
      <FormLabel component="legend">Preferences</FormLabel>
      <ToggleButtonGroup
        color="primary"
        fullWidth
        exclusive
        value={titles ? 'on' : 'off'}
        onChange={handleTitlesChange}
      >
        <ToggleButton value="on">Titles</ToggleButton>
        <ToggleButton value="off">Hidden</ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup
        color="primary"
        fullWidth
        exclusive
        value={tooltips ? 'on' : 'off'}
        onChange={handleTooltipsChange}
      >
        <ToggleButton value="on">Tooltips</ToggleButton>
        <ToggleButton value="off">Hidden</ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup
        color="primary"
        fullWidth
        exclusive
        value={detailedAntiTank ? 'on' : 'off'}
        onChange={handleDetailedAntiTankChange}
      >
        <ToggleButton value="on">Detailed Anti-Tank</ToggleButton>
        <ToggleButton value="off">Grouped Anti-Tank</ToggleButton>
      </ToggleButtonGroup>
    </Grid>
  );
}
