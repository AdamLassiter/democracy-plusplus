import { Card, Divider, Grid, Typography } from "@mui/material";
import ItemDisplay from "../../utils/itemDisplay";
import { getItem } from "../../constants";
import type { LogEntry, PurchaseLogEntry } from "../../types";
import { SectionTimestamp } from "./shared";

type PurchaseGroup = {
  id: string;
  divider?: {
    kind: "mission" | "tierListChange";
    missionNumber?: number;
  };
  purchases: PurchaseLogEntry[];
};

function buildPurchaseGroups(entries: LogEntry[]): PurchaseGroup[] {
  const groups: PurchaseGroup[] = [];
  let purchases: PurchaseLogEntry[] = [];
  let groupIndex = 0;

  for (const entry of entries) {
    if (entry.kind === "purchase") {
      purchases.push(entry);
      continue;
    }

    if (purchases.length) {
      groups.push({
        id: `purchase-group-${groupIndex++}-${entry.kind === "mission" ? entry.missionNumber : "tier-list-change"}`,
        divider: entry.kind === "mission"
          ? { kind: "mission", missionNumber: entry.missionNumber }
          : { kind: "tierListChange" },
        purchases,
      });
      purchases = [];
    }
  }

  if (purchases.length) {
    groups.push({
      id: `purchase-group-${groupIndex}`,
      purchases,
    });
  }

  return groups;
}

function PurchaseCard({ entry }: { entry: PurchaseLogEntry }) {
  const item = getItem(entry.itemDisplayName);

  return <Card sx={{ p: 1.5, height: "100%" }} variant="outlined">
    <Grid container direction="column" spacing={1} alignItems="center" textAlign="center">
      <Grid>
        {item && <ItemDisplay item={{ ...item, cost: entry.cost }} />}
      </Grid>
      <Grid>
        <Typography color="text.secondary">{entry.cost}¢</Typography>
        <SectionTimestamp timestamp={entry.timestamp} />
      </Grid>
    </Grid>
  </Card>;
}

export default function PurchasesLog({ entries }: { entries: LogEntry[] }) {
  const groups = buildPurchaseGroups(entries);

  return <Grid container direction="column" spacing={2}>
    {groups.map((group) => <Grid key={group.id}>
      {group.divider && <Divider sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {group.divider?.kind === "mission"
            ? `Mission ${group.divider.missionNumber} completed`
            : "Tier list changed"}
        </Typography>
      </Divider>}
      <Grid container spacing={2}>
        {group.purchases.map((entry) => <Grid key={entry.id} size={{ xs: 12, sm: 4, md: 3, lg: 2, xl: 1.5 }}>
          <PurchaseCard entry={entry} />
        </Grid>)}
      </Grid>
    </Grid>)}
  </Grid>;
}
