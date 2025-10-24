
import { Grid, ToggleButtonGroup, ToggleButton, FormLabel } from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import { selectPreferences, setTitles, setTooltips } from "../../slices/preferencesSlice";

export default function Preferences() {
  const dispatch = useDispatch();

  const { titles, tooltips } = useSelector(selectPreferences);
  function handleTitlesChange(_event, newValue) {
    dispatch(setTitles(newValue === 'on'));
  }
  function handleTooltipsChange(_event, newValue) {
    dispatch(setTooltips(newValue === 'on'));
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
    </Grid>
  );
}
