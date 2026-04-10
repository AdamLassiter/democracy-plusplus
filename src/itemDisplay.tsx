import type { SxProps, Theme } from "@mui/material/styles";
import type { Item, Tier } from "./types";
import { Card, CardActionArea, CardMedia, Typography } from "@mui/material";
import { useSelector } from "react-redux";

import { selectPreferences } from "./slices/preferencesSlice";
import ItemTooltip from "./itemTooltip";

type ItemDisplayProps = {
  item: Item;
  onClick?: (item: Item) => void;
  isAffordable?: boolean;
};

type MissingItem = Pick<Item, "displayName" | "imageUrl">;

type MissingProps = {
  item?: MissingItem;
  onClick?: () => void;
};

type ItemCardProps = {
  item: Item;
  onClick?: (item: Item) => void;
  isAffordable: boolean;
  titles: boolean;
};

const TIER_BORDER_COLORS: Record<Tier, string> = {
  s: "#2196f3",
  a: "#4caf50",
  b: "#f0fd35",
  c: "#fb8c00",
  d: "#e53935",
};

export default function ItemDisplay({ item, onClick, isAffordable = true }: ItemDisplayProps) {
  const { titles, tooltips } = useSelector(selectPreferences);

  const inner = <ItemCard
    onClick={onClick}
    item={item}
    isAffordable={isAffordable}
    titles={titles}
  />;

  if (!tooltips) {
    return inner;
  }

  return <ItemTooltip item={item}>
    {inner}
  </ItemTooltip>;
}

function ItemCard({ onClick, item, isAffordable, titles }: ItemCardProps) {
  return <Card
    onClick={() => onClick?.(item)}
    sx={{
      opacity: isAffordable ? 1 : 0.5,
      pointerEvents: isAffordable ? 'auto' : 'none',
      height: '180px',
      borderColor: TIER_BORDER_COLORS[item.tier],
    }}
    variant="outlined">
    <CardActionArea>
      <ItemIcon item={item} margin={1} width={110} minHeight={80} bgcolor='black' />
      {titles && <Typography sx={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        width: '110px',
        fontSize: '15px',
      }} margin={1}>{item.displayName}</Typography>}
    </CardActionArea>
  </Card>;
}

export function MissingPrimary({ item = { displayName: "Primary", imageUrl: "icons/gun.svg" }, onClick }: MissingProps) {
  return <Missing item={item} onClick={onClick} />
}

export function MissingSecondary({ item = { displayName: "Secondary", imageUrl: "icons/gun.svg" }, onClick }: MissingProps) {
  return <Missing item={item} onClick={onClick} />
}

export function MissingThrowable({ item = { displayName: "Throwable", imageUrl: "icons/gun.svg" }, onClick }: MissingProps) {
  return <Missing item={item} onClick={onClick} />
}

export function MissingArmor({ item = { displayName: "Armor", imageUrl: "icons/shieldPlus.svg" }, onClick }: MissingProps) {
  return <Missing item={item} onClick={onClick} />
}

export function MissingBooster({ item = { displayName: "Booster", imageUrl: "icons/shieldPlus.svg" }, onClick }: MissingProps) {
  return <Missing item={item} onClick={onClick} />
}

export function MissingStratagem({ item = { displayName: "Stratagem", imageUrl: "icons/missile.svg" }, onClick }: MissingProps) {
  return <Missing item={item} onClick={onClick} />
}

function Missing({ item, onClick }: { item: Item | MissingItem; onClick?: () => void }) {
  const { tooltips } = useSelector(selectPreferences);

  const inner = <Card onClick={onClick} variant="outlined">
    <ItemIcon item={item} margin={1} width={110} minHeight={80} />
  </Card>;

  const isFullItem = (obj: Item | MissingItem): obj is Item => 'properties' in obj;

  if (!tooltips || !isFullItem(item) || !item.properties || !Object.keys(item.properties).length) {
    return inner;
  }

  return <ItemTooltip item={item}>
    {inner}
  </ItemTooltip>;
}

export function ItemIcon({ item, ...props }: { item: Pick<Item, "imageUrl"> } & SxProps<Theme>) {
  const { imageUrl } = item;
  return <CardMedia sx={props} component="img" src={`${import.meta.env.BASE_URL}/images/${imageUrl}`} />;
}
