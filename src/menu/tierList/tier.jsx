import { Card, Grid, Typography } from "@mui/material";
import ItemDisplay from "../../itemDisplay";

export default function Tier({ items }) {
  const lists = Object.groupBy(items, (item) => item.tier);
  const tierOrder = ["s", "a", "b", "c", "d"];

  const sortedTiers = tierOrder
    .filter((tier) => lists[tier])
    .map((tier) => [tier, lists[tier]]);

  return <>
    <Grid direction="column" container spacing={1}>
      {sortedTiers.map(([tier, list]) => {
        return <Grid direction="row" container spacing={1}>
          <Card><Typography variant="h1" style={{ padding: '16px', width: '96px' }}>{tier.toUpperCase()}</Typography></Card>
          {list.map(item => <ItemDisplay item={item} />)}
        </Grid>
      })}
    </Grid>
  </>;
}