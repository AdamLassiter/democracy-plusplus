import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

import type { EnemyExplosionScenario } from "../../utils/damage/types";

export function ImpactScenarioSelector({
  scenarios,
  value,
  onChange,
}: {
  scenarios: EnemyExplosionScenario[];
  value: string;
  onChange: (_id: string) => void;
}) {
  if (!scenarios.length) return null;
  return (
    <FormControl fullWidth>
      <InputLabel id="damage-sim-impact-scenario-label">
        Impact scenario
      </InputLabel>
      <Select
        label="Impact scenario"
        labelId="damage-sim-impact-scenario-label"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <MenuItem value="">Selected part only</MenuItem>
        {scenarios.map((scenario) => (
          <MenuItem key={scenario.id} value={scenario.id}>
            {scenario.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
