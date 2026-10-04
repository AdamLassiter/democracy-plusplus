import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import {
  getPropertyFilters,
  normalizePropertyFilters,
  type PropertyFilterMode,
  type PropertyFilterName,
} from "../constants/filters";
import { selectPreferences } from "../slices/preferencesSlice";

export default function PropertyFilter({
  selectedFilters,
  filterMode,
  onChange,
  onFilterModeChange,
}: {
  selectedFilters: PropertyFilterName[];
  filterMode: PropertyFilterMode;
  onChange: (_filters: PropertyFilterName[]) => void;
  onFilterModeChange: (_mode: PropertyFilterMode) => void;
}) {
  const { detailedAntiTank = false, detailedDemolitionForce = false } =
    useSelector(selectPreferences);
  const propertyFilters = getPropertyFilters(
    detailedAntiTank,
    detailedDemolitionForce,
  );

  useEffect(() => {
    const normalizedFilters = normalizePropertyFilters(
      selectedFilters,
      detailedAntiTank,
      detailedDemolitionForce,
    );
    if (
      normalizedFilters.length !== selectedFilters.length ||
      normalizedFilters.some(
        (filterName, index) => filterName !== selectedFilters[index],
      )
    ) {
      onChange(normalizedFilters);
    }
  }, [detailedAntiTank, detailedDemolitionForce, onChange, selectedFilters]);

  return (
    <Box
      sx={{
        alignItems: "start",
        display: "grid",
        gap: 1,
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          md: "minmax(0, 1fr) auto",
        },
        mb: 2,
        minWidth: 0,
      }}
    >
      <Box
        aria-label="Property filters"
        sx={{
          minWidth: 0,
          ml: { xs: -1, sm: 0 },
          overflowX: "auto",
          pl: { xs: 1, sm: 0 },
          scrollbarWidth: "thin",
        }}
      >
        <ToggleButtonGroup
          color="primary"
          value={selectedFilters}
          onChange={(_event, newFilters) =>
            onChange(newFilters as PropertyFilterName[])
          }
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
      <ToggleButtonGroup
        aria-label="Filter combination"
        color="primary"
        exclusive
        value={filterMode}
        onChange={(_event, mode: PropertyFilterMode | null) => {
          if (mode) onFilterModeChange(mode);
        }}
        sx={{ flexShrink: 0, justifySelf: "end" }}
      >
        <ToggleButton value="or">OR</ToggleButton>
        <ToggleButton value="and">AND</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
