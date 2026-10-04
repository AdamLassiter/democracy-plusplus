import {
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  FormLabel,
} from "@mui/material";
import type { MouseEvent } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectPreferences,
  setDetailedAntiTank,
  setDetailedDemolitionForce,
  setItemDisplaySize,
  setTitles,
  setTooltips,
} from "../../slices/preferencesSlice";

export default function Preferences() {
  const dispatch = useDispatch();

  const {
    detailedAntiTank,
    detailedDemolitionForce = false,
    itemDisplaySize = "large",
    titles,
    tooltips,
  } = useSelector(selectPreferences);
  function handleTitlesChange(
    _event: MouseEvent<HTMLElement>,
    newValue: string | null,
  ) {
    dispatch(setTitles(newValue === "on"));
  }
  function handleTooltipsChange(
    _event: MouseEvent<HTMLElement>,
    newValue: string | null,
  ) {
    dispatch(setTooltips(newValue === "on"));
  }
  function handleDetailedAntiTankChange(
    _event: MouseEvent<HTMLElement>,
    newValue: string | null,
  ) {
    if (newValue !== null) {
      dispatch(setDetailedAntiTank(newValue === "on"));
    }
  }
  function handleDetailedDemolitionForceChange(
    _event: MouseEvent<HTMLElement>,
    newValue: string | null,
  ) {
    if (newValue !== null) {
      dispatch(setDetailedDemolitionForce(newValue === "on"));
    }
  }
  function handleItemDisplaySizeChange(
    _event: MouseEvent<HTMLElement>,
    newValue: "large" | "small" | null,
  ) {
    if (newValue !== null) {
      dispatch(setItemDisplaySize(newValue));
    }
  }

  return (
    <Grid container direction="column" spacing={2}>
      <FormLabel component="legend">Preferences</FormLabel>
      <ToggleButtonGroup
        aria-label="Item card size"
        color="primary"
        fullWidth
        exclusive
        value={itemDisplaySize}
        onChange={handleItemDisplaySizeChange}
      >
        <ToggleButton value="large">Large Items</ToggleButton>
        <ToggleButton value="small">Small Items</ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup
        color="primary"
        fullWidth
        exclusive
        value={titles ? "on" : "off"}
        onChange={handleTitlesChange}
      >
        <ToggleButton value="on">Titles</ToggleButton>
        <ToggleButton value="off">Hidden</ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup
        color="primary"
        fullWidth
        exclusive
        value={tooltips ? "on" : "off"}
        onChange={handleTooltipsChange}
      >
        <ToggleButton value="on">Tooltips</ToggleButton>
        <ToggleButton value="off">Hidden</ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup
        color="primary"
        fullWidth
        exclusive
        value={detailedAntiTank ? "on" : "off"}
        onChange={handleDetailedAntiTankChange}
      >
        <ToggleButton value="on">Detailed Anti-Tank</ToggleButton>
        <ToggleButton value="off">Grouped Anti-Tank</ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup
        color="primary"
        fullWidth
        exclusive
        value={detailedDemolitionForce ? "on" : "off"}
        onChange={handleDetailedDemolitionForceChange}
      >
        <ToggleButton value="on">Detailed Demo Force</ToggleButton>
        <ToggleButton value="off">Grouped Demo Force</ToggleButton>
      </ToggleButtonGroup>
    </Grid>
  );
}
