import { Card, Divider, Grid, Typography } from "@mui/material";
import ItemDisplay from "../../itemDisplay";
import { getConstant } from "../../constants";
import type { LogEntry, PurchaseLogEntry } from "../../types";
import { SectionTimestamp } from "./shared";

type PurchaseGroup = {
  id: string;
  dividerMissionNumber?: number;
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
        id: `purchase-group-${groupIndex++}-${entry.missionNumber}`,
        dividerMissionNumber: entry.missionNumber,
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
  const item = getConstant(entry.itemDisplayName);

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
    {groups.map((group, index) => <Grid key={group.id}>
      {index > 0 && <Divider sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Mission {group.dividerMissionNumber} completed
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
