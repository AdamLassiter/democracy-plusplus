import { Card, Grid, Typography } from "@mui/material";
import ItemDisplay from "../../itemDisplay";
import type { Item, Tier as TierName } from "../../types";

export default function Tier({ items }: { items: Item[] }) {
  const lists = Object.groupBy(items, (item) => item.tier) as Partial<Record<TierName, Item[]>>;
  const tierOrder: TierName[] = ["s", "a", "b", "c", "d"];

  const sortedTiers = tierOrder
    .filter((tier) => lists[tier])
    .map((tier) => [tier, lists[tier] ?? []] as const);

  return <>
    <Grid direction="column" container spacing={1}>
      {sortedTiers.map(([tier, list]) => {
        return <Grid key={tier} direction="row" container spacing={1}>
          <Card><Typography variant="h1" style={{ padding: '16px', width: '96px' }}>{tier.toUpperCase()}</Typography></Card>
          {list.map(item => <ItemDisplay key={item.displayName} item={item} />)}
        </Grid>
      })}
    </Grid>
  </>;
}
