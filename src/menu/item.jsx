import { Card, CardActionArea, CardContent, CardMedia, Tooltip, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { selectPreferences } from "../slices/preferencesSlice";

export default function DisplayItem({ item, onClick }) {
  const { titles, tooltips } = useSelector(selectPreferences);
  const { imageUrl } = item;

  const inner = <Card onClick={onClick} variant="outlined">
      <CardActionArea>
        <CardMedia sx={{ margin: 2, width: 100 }} component="img" src={`/images/${imageUrl}`} />
        {titles && <Typography sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '130px'
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
  return <Tooltip title={<>
    <Typography variant="h5">{displayName}</Typography>
    <Typography>Type: {type}<br />Category: {category}<br />Tags: {tags}<br />Warbond: {warbondCode}<br />Tier: {tier}</Typography>
  </>}>
    {children}
  </Tooltip>
}