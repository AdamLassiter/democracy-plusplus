import { Card, CardActionArea, CardContent, CardMedia, Tooltip, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { selectPreferences } from "../slices/preferencesSlice";
import { getWarbondByCode } from "../constants/warbonds";

export default function ItemDisplay({ item, onClick, isAffordable=true }) {
  const { titles, tooltips } = useSelector(selectPreferences);
  const { imageUrl } = item;

  const inner = <Card
    onClick={() => onClick(item)}
    sx={{
      opacity: isAffordable ? 1 : 0.5,
      pointerEvents: isAffordable ? 'auto' : 'none',
    }}
    variant="outlined">
    <CardActionArea>
      <CardMedia sx={{ margin: 1, width: 110 }} component="img" src={`/images/${imageUrl}`} />
      {titles && <Typography sx={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        width: '110px',
        fontSize: '15px',
      }}>{item.displayName}</Typography>}
    </CardActionArea>
  </Card>;

  if (tooltips) {
    return <ItemTooltip item={item}>
      {inner}
    </ItemTooltip>;
  } else {
    return inner;
  }
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
  const { imageUrl = null } = item;

  const inner = <Card onClick={onClick} variant="outlined">
    <CardMedia sx={{ margin: 2, width: 100 }} component="img" src={`/images/${imageUrl}`} />
  </Card>;

  if (tooltips) {
    return <ItemTooltip item={item}>
      {inner}
    </ItemTooltip>;
  } else {
    return inner;
  }
}

function ItemTooltip({ item: { displayName, type = "Select one...", category, tags, warbondCode, tier }, children }) {
  const warbond = getWarbondByCode(warbondCode);
  return <Tooltip title={<>
    <Typography variant="h5">{displayName}</Typography>
    <Typography>Type: {type}<br />Category: {category}<br />Tags: {tags}<br />Warbond: {warbond?.displayName}<br />Tier: {tier?.toUpperCase()}</Typography>
  </>}>
    {children}
  </Tooltip>
}