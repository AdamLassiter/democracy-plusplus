import { Badge, Grid, Typography } from "@mui/material";
import DisplayItem from "../item";

export default function OnSale({ items }) {
  const list = [...items].sort((a, b) => b.cost - a.cost);

  return <>
    <Typography variant="h4">On Sale</Typography>
    <Grid direction="row" container spacing={1}>
      {list.map(item => {
        return <Badge badgeContent={item.cost} color="success">
          <DisplayItem item={item} />
        </Badge>;
      })}
    </Grid>
  </>;
}
