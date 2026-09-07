import { Box, Chip, FormControl, InputLabel, MenuItem, Select, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import {
  retainPlannerItems,
  setEnemyCoverageFilters,
  setPlannerMode,
  setPlannerScope,
  setStructureCoverageFilters,
  togglePlannerItem,
} from "../../slices/plannerSlice";
import type { CoverageState, EnemyCoverageState } from "../../types";
import { usePlannerLoadout } from "./usePlannerLoadout";

const STRUCTURE_COVERAGE_OPTIONS: Array<{ value: CoverageState; label: string }> = [
  { value: "none", label: "None" },
  { value: "partial", label: "Partial" },
  { value: "full", label: "Full" },
];

const ENEMY_COVERAGE_OPTIONS: Array<{ value: EnemyCoverageState; label: string }> = [
  { value: "none", label: "None" },
  { value: "partialResisted", label: "Partial (Resisted)" },
  { value: "partial", label: "Partial" },
  { value: "fullResisted", label: "Full (Resisted)" },
  { value: "full", label: "Full" },
];

type CoverageKind = "enemy" | "structure";

function coverageTooltip(state: CoverageState | EnemyCoverageState, kind: CoverageKind) {
  if (kind === "structure") {
    if (state === "none") return "None: no structure targets can be destroyed by the enabled loadout's demolition force and BaDR-compatible attacks.";
    if (state === "partial") return "Partial: the enabled loadout can destroy some, but not all, targets on the structure.";
    return "Full: the enabled loadout can destroy every target on the structure.";
  }

  if (state === "none") return "None: the enabled loadout's AP is below every body part's AV, dealing 0% damage.";
  if (state === "partialResisted") return "Partial (Resisted): AP meets at least one body part's AV, but the loadout does not cover every part. Equal AP deals 65% damage.";
  if (state === "partial") return "Partial: AP strictly beats some body parts' AV, dealing 100% damage there, but does not cover every part.";
  if (state === "fullResisted") return "Full (Resisted): AP meets or beats every body part's AV, with at least one equal match. Equal AP deals 65% damage.";
  return "Full: AP strictly beats every body part's AV, dealing 100% damage.";
}

export function PlannerControls({ loadout, coverageKind }: {
  loadout: ReturnType<typeof usePlannerLoadout>;
  coverageKind: CoverageKind;
}) {
  const dispatch = useDispatch();
  const { planner, entries, members, localId } = loadout;
  const coverageOptions = coverageKind === "enemy" ? ENEMY_COVERAGE_OPTIONS : STRUCTURE_COVERAGE_OPTIONS;
  const coverageFilters = coverageKind === "enemy" ? planner.enemyCoverageFilters : planner.structureCoverageFilters;
  const keys = useMemo(() => entries.map((entry) => entry.key), [entries]);

  useEffect(() => {
    dispatch(retainPlannerItems(keys));
  }, [dispatch, keys]);

  return <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, my: 2 }}>
    <ToggleButtonGroup
      exclusive
      size="small"
      value={planner.mode}
      onChange={(_event, value) => value && dispatch(setPlannerMode(value))}
    >
      <ToggleButton value="browse">Browse</ToggleButton>
      <ToggleButton value="planner">Planner</ToggleButton>
    </ToggleButtonGroup>
    {planner.mode === "planner" && <>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="planner-player-label">Loadout</InputLabel>
          <Select
            label="Loadout"
            labelId="planner-player-label"
            value={planner.scope}
            onChange={(event) => dispatch(setPlannerScope(event.target.value))}
          >
            <MenuItem value="local">This player</MenuItem>
            {members.filter((member) => member.memberId !== localId).map((member) => (
              <MenuItem key={member.memberId} value={member.memberId}>{member.displayName}</MenuItem>
            ))}
            {members.length > 1 && <MenuItem value="squad">Whole squad</MenuItem>}
          </Select>
        </FormControl>
        <ToggleButtonGroup
          size="small"
          value={coverageFilters}
          onChange={(_event, values: Array<CoverageState | EnemyCoverageState>) => {
            if (coverageKind === "enemy") dispatch(setEnemyCoverageFilters(values as EnemyCoverageState[]));
            else dispatch(setStructureCoverageFilters(values as CoverageState[]));
          }}
        >
          {coverageOptions.map((option) => <Tooltip
            arrow
            enterDelay={300}
            key={option.value}
            title={coverageTooltip(option.value, coverageKind)}
          >
            <ToggleButton value={option.value} sx={{ cursor: "help" }}>{option.label}</ToggleButton>
          </Tooltip>)}
        </ToggleButtonGroup>
      </Box>
      <Box>
        <Typography color="text.secondary" variant="caption">Enabled equipped items</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5 }}>
          {entries.length === 0 && <Typography color="text.secondary">No equipment selected.</Typography>}
          {entries.map((entry) => {
            const compatible = entry.capabilities.length > 0;
            const enabled = compatible && !planner.disabledItemKeys.includes(entry.key);
            return <Tooltip key={entry.key} title={compatible ? entry.playerName : "This item has no compatible attack data"}>
              <span>
                <Chip
                  clickable={compatible}
                  color={enabled ? "primary" : "default"}
                  disabled={!compatible}
                  label={`${planner.scope === "squad" ? `${entry.playerName}: ` : ""}${entry.item.displayName}`}
                  onClick={() => compatible && dispatch(togglePlannerItem(entry.key))}
                  variant={enabled ? "filled" : "outlined"}
                />
              </span>
            </Tooltip>;
          })}
        </Box>
      </Box>
    </>}
  </Box>;
}
