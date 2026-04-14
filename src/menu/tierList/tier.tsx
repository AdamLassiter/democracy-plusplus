import { Card, Grid, Typography } from "@mui/material";
import ItemDisplay from "../../itemDisplay";
import type { EditableTier, Item } from "../../types";
import { EDITABLE_TIER_ORDER, TIER_ORDER } from "../../tierList";

const TIER_LABELS: Record<EditableTier, string> = {
  s: "S",
  a: "A",
  b: "B",
  c: "C",
  d: "D",
  uncategorized: "Uncategorized",
};

type TierBoardProps = {
  items: Item[];
  editMode?: boolean;
  draftAssignments?: Record<string, EditableTier>;
  onMoveToTier?: (displayName: string, tier: EditableTier) => void;
  onUncategorize?: (displayName: string) => void;
};

function TierBucket({
  tier,
  items,
  editMode = false,
  onMoveToTier,
  onUncategorize,
}: {
  tier: EditableTier;
  items: Item[];
  editMode?: boolean;
  onMoveToTier?: (displayName: string, tier: EditableTier) => void;
  onUncategorize?: (displayName: string) => void;
}) {
  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!editMode || !onMoveToTier) {
      return;
    }

    event.preventDefault();
    const displayName = event.dataTransfer.getData("text/plain");
    if (displayName) {
      onMoveToTier(displayName, tier);
    }
  }

  return <Grid
    direction="row"
    container
    spacing={1}
    onDragOver={(event) => editMode && event.preventDefault()}
    onDrop={handleDrop}
    sx={{
      minHeight: "124px",
      padding: 0.5,
      borderRadius: 1,
      border: editMode ? "1px dashed rgba(255,255,255,0.25)" : "none",
      alignItems: "flex-start",
    }}
  >
    <Card sx={{ flexShrink: 0 }}>
      <Typography variant="h1" style={{ padding: "16px", width: tier === "uncategorized" ? "200px" : "96px" }}>
        {TIER_LABELS[tier]}
      </Typography>
    </Card>
    {items.map((item) => <Grid
      key={item.displayName}
      draggable={editMode}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", item.displayName);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <ItemDisplay
        item={item}
        onClick={editMode ? () => onUncategorize?.(item.displayName) : undefined}
      />
    </Grid>)}
  </Grid>;
}

export default function TierBoard({
  items,
  editMode = false,
  draftAssignments = {},
  onMoveToTier,
  onUncategorize,
}: TierBoardProps) {
  const grouped = (editMode
    ? Object.groupBy(items, (item) => draftAssignments[item.displayName] ?? item.tier)
    : Object.groupBy(items, (item) => item.tier)) as Partial<Record<EditableTier, Item[]>>;

  const orderedTiers = editMode ? EDITABLE_TIER_ORDER : TIER_ORDER;

  return <Grid direction="column" container spacing={1}>
    {orderedTiers.map((tier) => <TierBucket
      key={tier}
      tier={tier}
      items={grouped[tier] ?? []}
      editMode={editMode}
      onMoveToTier={onMoveToTier}
      onUncategorize={onUncategorize}
    />)}
  </Grid>;
}
