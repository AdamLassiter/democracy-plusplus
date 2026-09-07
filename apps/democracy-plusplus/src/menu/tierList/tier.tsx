import { Box, Card, Typography } from "@mui/material";
import ItemDisplay from "../../utils/itemDisplay";
import type { DragEvent } from "react";
import type { EditableTier, Item } from "../../types";
import { EDITABLE_TIER_ORDER, TIER_ORDER } from "../../utils/tierList";

const TIER_LABELS: Record<EditableTier, string> = {
  s: "S",
  a: "A",
  b: "B",
  c: "C",
  d: "D",
  uncategorized: "Uncategorized",
};

const TIER_ACCENTS: Record<EditableTier, string> = {
  s: "#ffb300",
  a: "#a921df",
  b: "#3596fd",
  c: "#08bb00",
  d: "#bdbdbd",
  uncategorized: "#757575",
};

type TierBoardProps = {
  items: Item[];
  editMode?: boolean;
  draftAssignments?: Record<string, EditableTier>;
  onMoveToTier?: (_displayName: string, _tier: EditableTier) => void;
  onUncategorize?: (_displayName: string) => void;
  onOpenItem?: (_item: Item) => void;
};

function TierBucket({
  tier,
  items,
  editMode = false,
  onMoveToTier,
  onUncategorize,
  onOpenItem,
}: {
  tier: EditableTier;
  items: Item[];
  editMode?: boolean;
  onMoveToTier?: (_displayName: string, _tier: EditableTier) => void;
  onUncategorize?: (_displayName: string) => void;
  onOpenItem?: (_item: Item) => void;
}) {
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!editMode || !onMoveToTier) {
      return;
    }

    event.preventDefault();
    const displayName = event.dataTransfer.getData("text/plain");
    if (displayName) {
      onMoveToTier(displayName, tier);
    }
  }

  return <Box
    onDragOver={(event) => editMode && event.preventDefault()}
    onDrop={handleDrop}
    sx={{
      display: "grid",
      gap: 1,
      gridTemplateColumns: tier === "uncategorized" ? "112px minmax(0, 1fr)" : "88px minmax(0, 1fr)",
      minHeight: 196,
    }}
  >
    <Card
      variant="outlined"
      sx={{
        alignItems: "center",
        borderLeft: `6px solid ${TIER_ACCENTS[tier]}`,
        display: "flex",
        justifyContent: "center",
        minWidth: 0,
      }}
    >
      <Typography
        variant={tier === "uncategorized" ? "subtitle1" : "h2"}
        sx={{ fontWeight: 700, overflowWrap: "anywhere", px: 1, textAlign: "center" }}
      >
        {TIER_LABELS[tier]}
      </Typography>
    </Card>
    <Box
      sx={{
        alignContent: "flex-start",
        bgcolor: "rgba(255,255,255,0.025)",
        border: editMode ? "1px dashed rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.1)",
        borderRadius: 1,
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        minWidth: 0,
        p: 1,
      }}
    >
      {items.map((item) => <Box
        key={item.displayName}
        draggable={editMode}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", item.displayName);
          event.dataTransfer.effectAllowed = "move";
        }}
      >
        <ItemDisplay
          item={item}
          onClick={editMode ? () => onUncategorize?.(item.displayName) : onOpenItem}
        />
      </Box>)}
    </Box>
  </Box>;
}

export default function TierBoard({
  items,
  editMode = false,
  draftAssignments = {},
  onMoveToTier,
  onUncategorize,
  onOpenItem,
}: TierBoardProps) {
  const grouped = (editMode
    ? Object.groupBy(items, (item) => draftAssignments[item.displayName] ?? item.tier)
    : Object.groupBy(items, (item) => item.tier)) as Partial<Record<EditableTier, Item[]>>;

  const orderedTiers = editMode ? EDITABLE_TIER_ORDER : TIER_ORDER;

  return <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    {orderedTiers.map((tier) => <TierBucket
      key={tier}
      tier={tier}
      items={grouped[tier] ?? []}
      editMode={editMode}
      onMoveToTier={onMoveToTier}
      onUncategorize={onUncategorize}
      onOpenItem={onOpenItem}
    />)}
  </Box>;
}
