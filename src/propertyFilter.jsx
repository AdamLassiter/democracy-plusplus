import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { PROPERTY_FILTERS } from "./constants/filters";

export default function PropertyFilter({ selectedFilters, onChange }) {
  return (
    <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
      <ToggleButtonGroup
        color="primary"
        value={selectedFilters}
        onChange={(_event, newFilters) => onChange(newFilters)}
        sx={{ flexWrap: "wrap" }}
      >
        {PROPERTY_FILTERS.map((filterName) => (
          <ToggleButton
            key={filterName}
            value={filterName}
            sx={{ width: '120px' }}
          >
            {filterName}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
