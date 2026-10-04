import { Box, Tab, Tabs, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  itemMatchesPropertyFilters,
  type PropertyFilterMode,
  type PropertyFilterName,
} from "../../constants/filters";
import {
  combatSourceGroup,
  COMBAT_SOURCE_GROUPS,
  type CombatSourceGroup,
  type CombatSourceOption,
} from "../../utils/damage/combatSourceCatalog";
import {
  summarizeCombatSource,
  type DamageProfileSummary,
} from "../../utils/damage/profileSummary";
import PropertyFilter from "../../utils/propertyFilter";
import DamageProfileTable from "./damageProfileTable";
import { selectTierList } from "../../slices/tierListSlice";

export default function DamageSimulatorBrowse({
  sources,
  onPlan,
}: {
  sources: CombatSourceOption[];
  onPlan: (_source: CombatSourceOption, _profileIndex: number) => void;
}) {
  const [group, setGroup] = useState<CombatSourceGroup>(
    COMBAT_SOURCE_GROUPS[0],
  );
  const [selectedFilters, setSelectedFilters] = useState<PropertyFilterName[]>(
    [],
  );
  const [filterMode, setFilterMode] = useState<PropertyFilterMode>("or");
  const { overrides } = useSelector(selectTierList);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        COMBAT_SOURCE_GROUPS.map((candidate) => [
          candidate,
          sources.filter((source) => combatSourceGroup(source) === candidate)
            .length,
        ]),
      ) as Record<CombatSourceGroup, number>,
    [sources],
  );
  const visibleSources = useMemo(
    () =>
      sources.filter(
        (source) =>
          combatSourceGroup(source) === group &&
          itemMatchesPropertyFilters(source.item, selectedFilters, filterMode),
      ),
    [filterMode, group, selectedFilters, sources],
  );
  const rows = useMemo(
    () => visibleSources.flatMap(summarizeCombatSource),
    [visibleSources],
  );

  function openPlanner(row: DamageProfileSummary) {
    const source = visibleSources.find(
      ({ item }) => item.displayName === row.item.displayName,
    );
    if (source) onPlan(source, Math.max(0, row.profileIndex));
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <Tabs
        onChange={(_event, index: number) =>
          setGroup(COMBAT_SOURCE_GROUPS[index])
        }
        scrollButtons="auto"
        value={COMBAT_SOURCE_GROUPS.indexOf(group)}
        variant="scrollable"
      >
        {COMBAT_SOURCE_GROUPS.map((candidate) => (
          <Tab key={candidate} label={`${candidate} (${counts[candidate]})`} />
        ))}
      </Tabs>
      <Box sx={{ pt: 2 }}>
        <PropertyFilter
          filterMode={filterMode}
          onChange={setSelectedFilters}
          onFilterModeChange={setFilterMode}
          selectedFilters={selectedFilters}
        />
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          {rows.length}{" "}
          {rows.length === 1 ? "firing profile" : "firing profiles"}. Select a
          source to open it in the planner.
        </Typography>
        <DamageProfileTable
          onSelect={openPlanner}
          rows={rows}
          tierOverrides={overrides}
        />
      </Box>
    </Box>
  );
}
