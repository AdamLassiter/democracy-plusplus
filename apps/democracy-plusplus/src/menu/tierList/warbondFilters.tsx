import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type { Tier } from "../../types";
import {
  WARBOND_BEST_CATEGORIES,
  type WarbondBestTierFilters,
} from "../../utils/warbondSummary";
import { TIER_ORDER } from "../../utils/tierList";
import { TIER_ACCENTS, TIER_LABELS } from "./tierStyles";

export default function WarbondBestTierFilter({
  selectedFilters,
  onChange,
}: {
  selectedFilters: WarbondBestTierFilters;
  onChange: (_filters: WarbondBestTierFilters) => void;
}) {
  return <Box sx={{
    display: "flex",
    flexWrap: { xs: "nowrap", sm: "wrap" },
    gap: 1.5,
    mb: 2,
    mx: { xs: -1, sm: 0 },
    overflowX: { xs: "auto", sm: "visible" },
    px: { xs: 1, sm: 0 },
    scrollbarWidth: "thin",
  }}>
    {WARBOND_BEST_CATEGORIES.map(({ category, label }) => <Box
      key={category}
      sx={{ alignItems: "center", display: "flex", flexShrink: 0, gap: 0.5 }}
    >
      <Typography variant="body2" sx={{ minWidth: 72 }}>{label}</Typography>
      <ToggleButtonGroup
        size="small"
        value={selectedFilters[category] ?? []}
        onChange={(_event, tiers: Tier[]) => onChange({
          ...selectedFilters,
          [category]: tiers,
        })}
      >
        {TIER_ORDER.map((tier) => <ToggleButton
          key={tier}
          value={tier}
          aria-label={`${label} ${TIER_LABELS[tier]}`}
          sx={{
            borderBottomColor: TIER_ACCENTS[tier],
            minWidth: 36,
            px: 1,
          }}
        >
          {TIER_LABELS[tier]}
        </ToggleButton>)}
      </ToggleButtonGroup>
    </Box>)}
  </Box>;
}
