import { Divider, Grid } from "@mui/material";
import { ARMOR_PASSIVES } from "../constants/armorpassives";
import DisplayItem from "./item";
import { BOOSTERS } from "../constants/boosters";
import { PRIMARIES } from "../constants/primaries";
import { SECONDARIES } from "../constants/secondaries";
import { THROWABLES } from "../constants/throwables";
import { STRATAGEMS } from "../constants/stratagems";

export default function TierLists() {

  return <Grid direction="column" spacing={2} container>
    <TierList items={ARMOR_PASSIVES} />
    <Divider />
    <TierList items={BOOSTERS} />
    <Divider />
    <TierList items={PRIMARIES} />
    <Divider />
    <TierList items={SECONDARIES} />
    <Divider />
    <TierList items={THROWABLES} />
    <Divider />
    <TierList items={STRATAGEMS} />
  </Grid>;
}

function TierList({ items }) {
  const lists = Object.groupBy(items, (item) => item.tier);
  const tierOrder = ["s", "a", "b", "c", "d"];

  const sortedTiers = tierOrder
    .filter((tier) => lists[tier])
    .map((tier) => [tier, lists[tier]]);

  return <>
    <Grid direction="column" container spacing={1}>
      {sortedTiers.map(([tier, list]) => {
        return <Grid direction="row" container spacing={1}>
          {tier} {list.map(item => <DisplayItem item={item} />)}
        </Grid>
      })}
    </Grid>
  </>;
}
