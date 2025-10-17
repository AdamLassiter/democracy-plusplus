import { Box, Card, CardActionArea, CardContent, CardMedia, Tooltip, Typography } from "@mui/material";

export default function DisplayItem({ item, onClick }) {
  const { imageUrl } = item;

  return <ItemTooltip item={item}>
    <Card onClick={onClick} variant="outlined">
      <CardActionArea>
        <CardMedia sx={{ margin: 2, width: 100 }} component="img" src={`/images/${imageUrl}`} />
        <Typography sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '130px'
        }}>{item.displayName}</Typography>
      </CardActionArea>
    </Card>
  </ItemTooltip>;
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
  const { imageUrl = null } = item;

  return <ItemTooltip item={item}>
    <Card onClick={onClick} variant="outlined">
      <CardMedia sx={{ margin: 2, width: 100 }} component="img" src={`/images/${imageUrl}`} />
    </Card>
  </ItemTooltip>;
}

function ItemTooltip({ item: { displayName, type = "Select one...", category, tags, warbondCode, tier }, children }) {
  return <Tooltip title={<>
    <Typography variant="h5">{displayName}</Typography>
    <Typography>Type: {type}<br />Category: {category}<br />Tags: {tags}<br />Warbond: {warbondCode}<br />Tier: {tier}</Typography>
  </>}>
    {children}
  </Tooltip>
}