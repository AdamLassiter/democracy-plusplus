import { Card, Chip, Grid, List, ListItem, Typography } from "@mui/material";
import ItemDisplay from "../../itemDisplay";
import { getConstant } from "../../constants";
import type { LogEntry, MissionLogEntry, MissionOutcome } from "../../types";
import { SectionTimestamp } from "./shared";

function SummaryList({ title, items = [] }: { title: string; items?: MissionOutcome[] }) {
  return <Grid container direction="column" spacing={1}>
    <Typography variant="subtitle2">{title}</Typography>
    {!items.length && <Typography color="text.secondary">None</Typography>}
    {!!items.length && <Grid container spacing={1}>
      {items.map((item) => <Grid key={item.name}>
        <Chip
          label={item.name}
          size="small"
          color={item.completed ? "success" : "error"}
          variant="outlined"
        />
      </Grid>)}
    </Grid>}
  </Grid>;
}

function UsedItems({ items = [] }: { items?: string[] }) {
  return <Grid container direction="column" spacing={1}>
    <Typography variant="subtitle2">Items Used</Typography>
    {!items.length && <Typography color="text.secondary">None</Typography>}
    {!!items.length && <Grid container spacing={1}>
      {items.map((itemName) => {
        const item = getConstant(itemName);

        return <Grid key={itemName}>
          {item
            ? <ItemDisplay item={item} />
            : <Chip label={itemName} size="small" variant="outlined" />}
        </Grid>;
      })}
    </Grid>}
  </Grid>;
}

function MissionCard({ entry }: { entry: MissionLogEntry }) {
  const usedItemsCost = entry.usedItemsCost ?? 0;
  const profit = entry.totalReward - usedItemsCost;

  return <Card sx={{ p: 2, width: "100%" }} variant="outlined">
    <Grid container direction="column" spacing={1}>
      <Grid container justifyContent="space-between" alignItems="center">
        <Typography variant="h6">
          Mission {entry.missionNumber}: {entry.objective}
        </Typography>
        <SectionTimestamp timestamp={entry.timestamp} />
      </Grid>
      <Typography color="text.secondary">
        {entry.faction} | {"★".repeat(entry.stars)}{"☆".repeat(5 - entry.stars)}
      </Typography>
      <Typography>
        Total Reward: {entry.totalReward}¢ | Item Cost: {usedItemsCost}¢ | Profit:{" "}
        <Typography component="span" color={profit >= 0 ? "success" : "error"}>
          {profit}¢
        </Typography>
      </Typography>
      <UsedItems items={entry.usedItems ?? []} />
      <SummaryList title="Discretionary Assignments" items={entry.quests ?? []} />
      <SummaryList title="Rules of Engagement" items={entry.restrictions ?? []} />
    </Grid>
  </Card>;
}

export default function MissionsLog({ entries }: { entries: LogEntry[] }) {
  const missionEntries = entries.filter((entry): entry is MissionLogEntry => entry.kind === "mission");

  return <List sx={{ p: 0 }}>
    {missionEntries.map((entry) => <ListItem key={entry.id} disablePadding sx={{ pb: 2 }}>
      <MissionCard entry={entry} />
    </ListItem>)}
  </List>;
}
