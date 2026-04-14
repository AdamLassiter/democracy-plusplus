import type { SxProps, Theme } from "@mui/material/styles";
import type { Item, Tier } from "./types";
import { Box, Card, CardActionArea, CardMedia, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { useSelector } from "react-redux";

import { selectPreferences } from "./slices/preferencesSlice";
import { selectTierList } from "./slices/tierListSlice";
import { getEffectiveTier } from "./tierList";
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
  effectiveTier: Tier;
  onClick?: (item: Item) => void;
  isAffordable: boolean;
  titles: boolean;
};

const TIER_BORDER_COLORS: Record<Tier, string> = {
  s: "#ffb300",
  a: "#a921df",
  b: "#3596fd",
  c: "#08fb00",
  d: "#ffffff",
};

const STRATAGEM_DIRECTION_ICONS = {
  Up: ArrowUpwardIcon,
  Down: ArrowDownwardIcon,
  Left: ArrowBackIcon,
  Right: ArrowForwardIcon,
} as const;

function isStratagemDirection(direction: string): direction is keyof typeof STRATAGEM_DIRECTION_ICONS {
  return direction in STRATAGEM_DIRECTION_ICONS;
}

export default function ItemDisplay({ item, onClick, isAffordable = true }: ItemDisplayProps) {
  const { titles, tooltips } = useSelector(selectPreferences);
  const { overrides } = useSelector(selectTierList);
  const effectiveTier = getEffectiveTier(item, overrides);

  const inner = <ItemCard
    onClick={onClick}
    item={item}
    effectiveTier={effectiveTier}
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

function ItemCard({ onClick, item, effectiveTier, isAffordable, titles }: ItemCardProps) {
  return <Card
    onClick={() => onClick?.(item)}
    sx={{
      opacity: isAffordable ? 1 : 0.5,
      pointerEvents: isAffordable ? 'auto' : 'none',
      height: '180px',
      borderColor: TIER_BORDER_COLORS[effectiveTier],
    }}
    variant="outlined">
    <CardActionArea>
      <ItemIcon item={item} margin={1} width={110} minHeight={80} bgcolor='black' />
      {titles && <>
        <Typography sx={{
          display: '-webkit-box',
          WebkitLineClamp: item.stratagemCode?.length ? 1 : 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '110px',
          fontSize: '15px',
        }} margin={1}>{item.displayName}</Typography>
        {!!item.stratagemCode?.length && <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '28px',
          width: '110px',
          color: 'text.secondary',
        }} marginX={1} marginBottom={1}>
          {item.stratagemCode.map((direction, index) => {
            const DirectionIcon = isStratagemDirection(direction) ? STRATAGEM_DIRECTION_ICONS[direction] : null;
            return DirectionIcon
              ? <DirectionIcon key={`${direction}-${index}`} sx={{ fontSize: '12px' }} />
              : <Typography key={`${direction}-${index}`} sx={{ fontSize: '9px' }}>{direction}</Typography>;
          })}
        </Box>}
      </>}
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
