import { Card, CardActionArea, CardMedia, Typography } from "@mui/material";
import { useSelector } from "react-redux";

import { selectPreferences } from "./slices/preferencesSlice";
import ItemTooltip from "./itemTooltip";

export default function ItemDisplay({ item, onClick, isAffordable = true }) {
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

function ItemCard({ onClick, item, isAffordable, titles }) {
  return <Card
    onClick={() => onClick(item)}
    sx={{
      opacity: isAffordable ? 1 : 0.5,
      pointerEvents: isAffordable ? 'auto' : 'none',
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

export function MissingPrimary({ item = { displayName: "Primary", imageUrl: "icons/gun.svg" }, onClick }) {
  return <Missing item={item} onClick={onClick} />
}

export function MissingSecondary({ item = { displayName: "Secondary", imageUrl: "icons/gun.svg" }, onClick }) {
  return <Missing item={item} onClick={onClick} />
}

export function MissingThrowable({ item = { displayName: "Throwable", imageUrl: "icons/gun.svg" }, onClick }) {
  return <Missing item={item} onClick={onClick} />
}

export function MissingArmor({ item = { displayName: "Armor", imageUrl: "icons/shieldPlus.svg" }, onClick }) {
  return <Missing item={item} onClick={onClick} />
}

export function MissingBooster({ item = { displayName: "Booster", imageUrl: "icons/shieldPlus.svg" }, onClick }) {
  return <Missing item={item} onClick={onClick} />
}

export function MissingStratagem({ item = { displayName: "Stratagem", imageUrl: "icons/missile.svg" }, onClick }) {
  return <Missing item={item} onClick={onClick} />
}

function Missing({ item, onClick }) {
  const { tooltips } = useSelector(selectPreferences);

  const inner = <Card onClick={onClick} variant="outlined">
    <ItemIcon item={item} margin={1} width={110} minHeight={80} />
  </Card>;

  if (!tooltips || !item.hoverTexts?.length) {
    return inner;
  }

  return <ItemTooltip item={item}>
    {inner}
  </ItemTooltip>;
}

export function ItemIcon({ item, ...props }) {
  const { imageUrl } = item;
  return <CardMedia sx={props} component="img" src={`${import.meta.env.BASE_URL}/images/${imageUrl}`} />;
}