import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { PROPERTY_FILTERS, type PropertyFilterName } from "../constants/filters";

export default function PropertyFilter({
  selectedFilters,
  onChange,
}: {
  selectedFilters: PropertyFilterName[];
  onChange: (_filters: PropertyFilterName[]) => void;
}) {
  return (
    <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
      <ToggleButtonGroup
        color="primary"
        value={selectedFilters}
        onChange={(_event, newFilters) => onChange(newFilters as PropertyFilterName[])}
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
