import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

import type { WeaponProfile } from "../../utils/damage/types";

export function ProfileSelector({ profiles, selectedIndex, onChange, label = "Firing profile" }: {
  profiles: WeaponProfile[];
  selectedIndex: number;
  onChange: (_index: number) => void;
  label?: string;
}) {
  if (profiles.length < 2) return null;
  return <FormControl fullWidth sx={{ mt: 1.5 }}>
    <InputLabel id="damage-sim-profile-label">{label}</InputLabel>
    <Select
      label={label}
      labelId="damage-sim-profile-label"
      onChange={(event) => onChange(Number(event.target.value))}
      value={String(selectedIndex)}
    >
      {profiles.map((profile, index) => <MenuItem key={profile.id} value={String(index)}>
        {profile.label}
      </MenuItem>)}
    </Select>
  </FormControl>;
}
