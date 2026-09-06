import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import {
  getPropertyFilters,
  normalizeAntiTankFilters,
  type PropertyFilterName,
} from "../constants/filters";
import { selectPreferences } from "../slices/preferencesSlice";

export default function PropertyFilter({
  selectedFilters,
  onChange,
}: {
  selectedFilters: PropertyFilterName[];
  onChange: (_filters: PropertyFilterName[]) => void;
}) {
  const { detailedAntiTank = false } = useSelector(selectPreferences);
  const propertyFilters = getPropertyFilters(detailedAntiTank);

  useEffect(() => {
    const normalizedFilters = normalizeAntiTankFilters(selectedFilters, detailedAntiTank);
    if (
      normalizedFilters.length !== selectedFilters.length
      || normalizedFilters.some((filterName, index) => filterName !== selectedFilters[index])
    ) {
      onChange(normalizedFilters);
    }
  }, [detailedAntiTank, onChange, selectedFilters]);

  return (
    <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
      <ToggleButtonGroup
        color="primary"
        value={selectedFilters}
        onChange={(_event, newFilters) => onChange(newFilters as PropertyFilterName[])}
        sx={{ flexWrap: "wrap" }}
      >
        {propertyFilters.map((filterName) => (
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
