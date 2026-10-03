import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import {
  getPropertyFilters,
  normalizePropertyFilters,
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
  const { detailedAntiTank = false, detailedDemolitionForce = false } = useSelector(selectPreferences);
  const propertyFilters = getPropertyFilters(detailedAntiTank, detailedDemolitionForce);

  useEffect(() => {
    const normalizedFilters = normalizePropertyFilters(
      selectedFilters,
      detailedAntiTank,
      detailedDemolitionForce,
    );
    if (
      normalizedFilters.length !== selectedFilters.length
      || normalizedFilters.some((filterName, index) => filterName !== selectedFilters[index])
    ) {
      onChange(normalizedFilters);
    }
  }, [detailedAntiTank, detailedDemolitionForce, onChange, selectedFilters]);

  return (
    <Box
      aria-label="Property filters"
      sx={{
        mb: 2,
        mx: { xs: -1, sm: 0 },
        overflowX: { xs: "auto", sm: "visible" },
        px: { xs: 1, sm: 0 },
        scrollbarWidth: "thin",
      }}
    >
      <ToggleButtonGroup
        color="primary"
        value={selectedFilters}
        onChange={(_event, newFilters) => onChange(newFilters as PropertyFilterName[])}
        sx={{
          flexWrap: { xs: "nowrap", sm: "wrap" },
          minWidth: "max-content",
        }}
      >
        {propertyFilters.map((filterName) => (
          <ToggleButton
            key={filterName}
            value={filterName}
            sx={{ minWidth: { xs: 104, sm: 120 } }}
          >
            {filterName}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
