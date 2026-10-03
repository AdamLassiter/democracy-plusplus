import type { SxProps, Theme } from "@mui/material/styles";
import type { Item, Tier } from "../types";
import { Card, CardActionArea, CardMedia, Typography } from "@mui/material";
import { useSelector } from "react-redux";

import { selectPreferences } from "../slices/preferencesSlice";
import { selectTierList } from "../slices/tierListSlice";
import { StratagemCodeDisplay } from "./stratagemCode";
import { getEffectiveTier } from "./tierList";
import ItemTooltip from "./itemTooltip";

type ItemDisplayProps = {
  item: Item;
  onClick?: (_item: Item) => void;
  isAffordable?: boolean;
  compact?: boolean;
};

type MissingItem = Pick<Item, "displayName" | "imageUrl">;

type MissingProps = {
  item?: MissingItem;
  onClick?: () => void;
};

type ItemCardProps = {
  item: Item;
  effectiveTier: Tier;
  onClick?: (_item: Item) => void;
  isAffordable: boolean;
  titles: boolean;
  compact: boolean;
  small: boolean;
};

const TIER_BORDER_COLORS: Record<Tier, string> = {
  s: "#ffb300",
  a: "#a921df",
  b: "#3596fd",
  c: "#08fb00",
  d: "#ffffff",
};

export default function ItemDisplay({ item, onClick, isAffordable = true, compact = false }: ItemDisplayProps) {
  const { itemDisplaySize = "large", titles, tooltips } = useSelector(selectPreferences);
  const { overrides } = useSelector(selectTierList);
  const effectiveTier = getEffectiveTier(item, overrides);
  const small = !compact && itemDisplaySize === "small";

  const inner = <ItemCard
    onClick={onClick}
    item={item}
    effectiveTier={effectiveTier}
    isAffordable={isAffordable}
    titles={titles}
    compact={compact}
    small={small}
  />;

  if (!tooltips) {
    return inner;
  }

  return <ItemTooltip item={item}>
    {inner}
  </ItemTooltip>;
}

export function CompactItemDisplay(props: Omit<ItemDisplayProps, "compact">) {
  return <ItemDisplay {...props} compact />;
}

function ItemCard({ onClick, item, effectiveTier, isAffordable, titles, compact, small }: ItemCardProps) {
  const imageWidth = compact ? 44 : small ? { xs: 60, sm: 68 } : { xs: 84, sm: 110 };
  const imageHeight = compact ? 32 : small ? { xs: 44, sm: 50 } : { xs: 62, sm: 80 };
  const cardHeight = compact ? 60 : small ? { xs: 112, sm: 124 } : { xs: 154, sm: 180 };
  const cardWidth = compact ? 60 : small ? { xs: 76, sm: 84 } : { xs: 100, sm: 126 };
  const contentWidth = small ? { xs: 60, sm: 68 } : { xs: 84, sm: 110 };
  const showTitles = titles && !compact;

  return <Card
    onClick={() => onClick?.(item)}
    sx={{
      opacity: isAffordable ? 1 : 0.5,
      pointerEvents: isAffordable ? 'auto' : 'none',
      height: typeof cardHeight === "number" ? `${cardHeight}px` : cardHeight,
      width: cardWidth,
      borderColor: TIER_BORDER_COLORS[effectiveTier],
    }}
    variant="outlined">
    <CardActionArea>
      <ItemIcon item={item} margin={1} width={imageWidth} minHeight={imageHeight} bgcolor='black' />
      {showTitles && <>
        <Typography sx={{
          display: '-webkit-box',
          WebkitLineClamp: item.stratagemCode?.length ? 1 : 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: contentWidth,
          fontSize: small ? { xs: '11px', sm: '12px' } : { xs: '14px', sm: '15px' },
        }} margin={1}>{item.displayName}</Typography>
        {!!item.stratagemCode?.length && <Typography component="div" marginX={1} marginBottom={1} width={contentWidth}>
          <StratagemCodeDisplay code={item.stratagemCode} iconSize={small ? 9 : 12} />
        </Typography>}
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
  const { itemDisplaySize = "large", tooltips } = useSelector(selectPreferences);
  const small = itemDisplaySize === "small";

  const inner = <Card onClick={onClick} variant="outlined" sx={{ width: small ? { xs: 76, sm: 84 } : { xs: 100, sm: 126 } }}>
    <ItemIcon
      item={item}
      margin={1}
      width={small ? { xs: 60, sm: 68 } : { xs: 84, sm: 110 }}
      minHeight={small ? { xs: 44, sm: 50 } : { xs: 62, sm: 80 }}
    />
  </Card>;

  function isFullItem(obj: Item | MissingItem): obj is Item {
    return "tier" in obj;
  }

  if (!tooltips || !isFullItem(item)) {
    return inner;
  }

  return <ItemTooltip item={item}>
    {inner}
  </ItemTooltip>;
}

export function ItemIcon({ item, ...props }: { item: Pick<Item, "imageUrl"> } & SxProps<Theme>) {
  const { imageUrl } = item;
  return <CardMedia sx={props} component="img" src={`${import.meta.env.BASE_URL}images/${imageUrl}`} />;
}
