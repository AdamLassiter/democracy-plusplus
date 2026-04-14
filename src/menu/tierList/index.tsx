import { Box, Fab, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { useMemo, useState, type SyntheticEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ARMOR_PASSIVES } from "../../constants/armor_passives";
import { BOOSTERS } from "../../constants/boosters";
import { PRIMARIES } from "../../constants/primaries";
import { SECONDARIES } from "../../constants/secondaries";
import { STRATAGEMS } from "../../constants/stratagems";
import { THROWABLES } from "../../constants/throwables";
import { ITEMS } from "../../constants/items";
import PropertyFilter from "../../propertyFilter";
import { filterItemsByPropertyValues } from "../../constants/filters";
import TierBoard from "./tier";
import { addTierListChangeLogEntry } from "../../slices/logSlice";
import { selectMission } from "../../slices/missionSlice";
import { resetShop } from "../../slices/shopSlice";
import { selectTierList, setTierList } from "../../slices/tierListSlice";
import { applyTierOverrides, buildTierDraft } from "../../tierList";
import type { EditableTier, Item, Tier } from "../../types";
import type { PropertyFilterName } from "../../constants/filters";

export default function TierLists() {
  const dispatch = useDispatch();
  const { overrides } = useSelector(selectTierList);
  const { count } = useSelector(selectMission);

  const [value, setValue] = useState(0);
  const [selectedFilters, setSelectedFilters] = useState<PropertyFilterName[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [draftAssignments, setDraftAssignments] = useState<Record<string, EditableTier>>({});

  const tierLists: [string, Item[]][] = [
    ["Primaries", PRIMARIES],
    ["Secondaries", SECONDARIES],
    ["Throwables", THROWABLES],
    ["Armor Passives", ARMOR_PASSIVES],
    ["Stratagems", STRATAGEMS],
    ["Boosters", BOOSTERS],
  ];

  const effectiveTierLists = useMemo(
    () => tierLists.map(([label, items]) => [label, applyTierOverrides(items, overrides)] as const),
    [overrides],
  );

  const [, items] = effectiveTierLists[value];
  const filteredItems = filterItemsByPropertyValues(items, selectedFilters);
  const uncategorizedCount = Object.values(draftAssignments).filter((tier) => tier === "uncategorized").length;
  const hasUncategorized = uncategorizedCount > 0;

  function handleChange(_event: SyntheticEvent, newValue: number) {
    setValue(newValue);
  }

  function handleEnterEditMode() {
    setDraftAssignments(buildTierDraft(ITEMS, overrides));
    setEditMode(true);
  }

  function handleMoveToTier(displayName: string, tier: EditableTier) {
    setDraftAssignments((current) => ({
      ...current,
      [displayName]: tier,
    }));
  }

  function handleSave() {
    if (hasUncategorized) {
      return;
    }

    const nextOverrides = ITEMS.reduce<Record<string, Tier>>((acc, item) => {
      const assignedTier = draftAssignments[item.displayName];
      if (assignedTier && assignedTier !== "uncategorized" && assignedTier !== item.tier) {
        acc[item.displayName] = assignedTier;
      }
      return acc;
    }, {});

    dispatch(setTierList({
      customized: Object.keys(nextOverrides).length > 0,
      overrides: nextOverrides,
    }));
    dispatch(addTierListChangeLogEntry({
      kind: "tierListChange",
      id: `tier-list-change-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }));
    dispatch(resetShop({ missionCount: count, tierOverrides: nextOverrides }));
    setEditMode(false);
    setDraftAssignments({});
  }

  return (
    <Box sx={{ width: "100%", position: "relative" }}>
      <Typography variant="h5">Tier List</Typography>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={value} onChange={handleChange}>
          {effectiveTierLists.map(([displayName]) => <Tab key={displayName} label={displayName} />)}
        </Tabs>
      </Box>
      <Box sx={{ padding: "1em", pb: 10 }}>
        <PropertyFilter selectedFilters={selectedFilters} onChange={setSelectedFilters} />
        {editMode && hasUncategorized && <Typography color="warning.main" sx={{ mb: 2 }}>
          Assign all uncategorized items to S, A, B, C, or D before saving.
        </Typography>}
        <TierBoard
          items={filteredItems}
          editMode={editMode}
          draftAssignments={draftAssignments}
          onMoveToTier={handleMoveToTier}
          onUncategorize={(displayName) => handleMoveToTier(displayName, "uncategorized")}
        />
      </Box>
          <Fab
            color="primary"
            sx={{ position: "fixed", bottom: 24, right: 24 }}
            onClick={editMode ? handleSave : handleEnterEditMode}
            disabled={editMode && hasUncategorized}
          >
            {editMode ? <SaveIcon /> : <EditIcon />}
          </Fab>
    </Box>
  );
}
