import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getWarbondByCode } from "../../constants/warbonds";
import { STRUCTURES } from "../../constants/structures";
import type { Item } from "../../types";
import { extractItemCapabilities } from "../../utils/capabilities";
import { ItemIcon } from "../../utils/itemDisplay";
import { ItemPropertiesDisplay } from "../../utils/itemTooltip";
import { StratagemCodeDisplay } from "../../utils/stratagemCode";

function demolitionSource(item: Item) {
  const slug = item.wikiSlug?.replace(/#.*/, "").toLowerCase();
  return STRUCTURES.demolitionSources.find((source) => source.wikiSlug.replace(/#.*/, "").toLowerCase() === slug)
    ?? STRUCTURES.demolitionSources.find((source) => source.displayName.toLowerCase() === item.displayName.toLowerCase());
}

export default function ItemDetailsDialog({ item, onClose }: { item: Item | null; onClose: () => void }) {
  if (!item) return null;

  const warbond = item.warbondCode ? getWarbondByCode(item.warbondCode) : undefined;
  const capabilities = extractItemCapabilities(item, demolitionSource(item));
  const wikiUrl = item.wikiSlug
    ? `https://helldivers.wiki.gg/wiki/${item.wikiSlug.split("/").map(encodeURIComponent).join("/")}`
    : null;

  return <Dialog open maxWidth="md" fullWidth onClose={onClose}>
    <DialogTitle>{item.displayName}</DialogTitle>
    <DialogContent>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "240px 1fr" }, gap: 3 }}>
        <Box>
          <ItemIcon item={item} width="100%" minHeight={160} maxHeight={240} bgcolor="black" objectFit="contain" />
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
            <Chip label={`Tier ${item.tier.toUpperCase()}`} color="primary" />
            {item.type && <Chip label={item.type} />}
            {item.category && <Chip label={item.category} />}
            {warbond && <Chip label={warbond.displayName} variant="outlined" />}
          </Stack>
          {!!item.stratagemCode?.length && <Box sx={{ mt: 2 }}>
            <Typography variant="overline">Stratagem code</Typography>
            <StratagemCodeDisplay code={item.stratagemCode} iconSize={22} />
          </Box>}
          {wikiUrl && <Button href={wikiUrl} target="_blank" rel="noreferrer" endIcon={<OpenInNewIcon />} sx={{ mt: 2 }}>
            View on wiki
          </Button>}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          {capabilities.length > 0 && <>
            <Typography variant="h6">Planner capabilities</Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead><TableRow><TableCell>Attack</TableCell><TableCell>Penetration</TableCell><TableCell>Demolition</TableCell><TableCell>Explosive</TableCell></TableRow></TableHead>
              <TableBody>{capabilities.map((capability, index) => <TableRow key={`${capability.attackName}-${index}`}>
                <TableCell>{capability.attackName}</TableCell>
                <TableCell>{capability.armorPenetration ?? "—"}</TableCell>
                <TableCell>{capability.demolitionForce ?? "—"}</TableCell>
                <TableCell>{capability.explosive ? "Yes" : "No"}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
            <Divider sx={{ mb: 2 }} />
          </>}
          <Typography variant="h6" sx={{ mb: 1 }}>Properties</Typography>
          <ItemPropertiesDisplay item={item} />
        </Box>
      </Box>
    </DialogContent>
  </Dialog>;
}
