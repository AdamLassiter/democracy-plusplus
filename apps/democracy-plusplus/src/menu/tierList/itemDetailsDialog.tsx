import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Alert,
  Button,
  Chip,
  Dialog,
  DialogContent,
  Divider,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { getWarbondByCode } from "../../constants/warbonds";
import { STRUCTURES } from "../../constants/structures";
import type { Item } from "../../types";
import { extractItemCapabilities } from "../../utils/capabilities";
import { ItemIcon } from "../../utils/itemDisplay";
import { ItemPropertiesDisplay } from "../../utils/itemTooltip";
import { StratagemCodeDisplay } from "../../utils/stratagemCode";
import { extractCombatSourceProfiles } from "../../utils/damage/combatProfiles";
import { summarizeCombatSource } from "../../utils/damage/profileSummary";
import DamageProfileTable from "../damageSimulator/damageProfileTable";
import CloseableDialogTitle from "../../utils/closeableDialogTitle";

function demolitionSource(item: Item) {
  const slug = item.wikiSlug?.replace(/#.*/, "").toLowerCase();
  return STRUCTURES.demolitionSources.find((source) => source.wikiSlug.replace(/#.*/, "").toLowerCase() === slug)
    ?? STRUCTURES.demolitionSources.find((source) => source.displayName.toLowerCase() === item.displayName.toLowerCase());
}

export default function ItemDetailsDialog({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  useEffect(() => setTab(0), [item?.displayName]);
  if (!item) return null;

  const warbond = item.type !== "Warbond" && item.warbondCode ? getWarbondByCode(item.warbondCode) : undefined;
  const capabilities = extractItemCapabilities(item, demolitionSource(item));
  const hasProperties = Boolean(item.properties && Object.keys(item.properties).length);
  const wikiUrl = item.wikiSlug
    ? `https://helldivers.wiki.gg/wiki/${item.wikiSlug.split("/").map(encodeURIComponent).join("/")}`
    : null;
  const simulationResult = extractCombatSourceProfiles(item);
  const simulationRows = summarizeCombatSource({ item, result: simulationResult });

  return <Dialog open maxWidth="md" fullWidth onClose={onClose}>
    <CloseableDialogTitle onClose={onClose}>{item.displayName}</CloseableDialogTitle>
    <DialogContent>
      <Tabs
        aria-label="Item details"
        onChange={(_event, value: number) => setTab(value)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
        value={tab}
      >
        <Tab label="Overview" />
        <Tab label="Damage simulator" />
      </Tabs>
      {tab === 0 && <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "240px 1fr" }, gap: 3 }}>
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
          {item.description && <>
            <Typography variant="h6" sx={{ mb: 1 }}>Description</Typography>
            <Typography sx={{ mb: 2, whiteSpace: "pre-line" }}>{item.description}</Typography>
            {(capabilities.length > 0 || hasProperties) && <Divider sx={{ mb: 2 }} />}
          </>}
          {capabilities.length > 0 && <>
            <Typography variant="h6">Planner capabilities</Typography>
            <TableContainer sx={{ mb: 2 }}><Table size="small">
              <TableHead><TableRow><TableCell>Attack</TableCell><TableCell>Penetration</TableCell><TableCell>Demolition</TableCell><TableCell>Explosive</TableCell></TableRow></TableHead>
              <TableBody>{capabilities.map((capability, index) => <TableRow key={`${capability.attackName}-${index}`}>
                <TableCell>{capability.attackName}</TableCell>
                <TableCell>{capability.armorPenetration ?? "—"}</TableCell>
                <TableCell>{capability.demolitionForce ?? "—"}</TableCell>
                <TableCell>{capability.explosive ? "Yes" : "No"}</TableCell>
              </TableRow>)}</TableBody>
            </Table></TableContainer>
            <Divider sx={{ mb: 2 }} />
          </>}
          {(!item.description || hasProperties) && <>
            <Typography variant="h6" sx={{ mb: 1 }}>Properties</Typography>
            <ItemPropertiesDisplay item={item} />
          </>}
        </Box>
      </Box>}
      {tab === 1 && <Box sx={{ minWidth: 0 }}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Raw point-blank output for each firing profile. Sustained values include reloads for weapons and cooldown or rearm timing for finite deployments; total is one full magazine or deployment.{" "}
          Unbounded sources have no finite total.
        </Typography>
        {!simulationResult.profiles.length && <Alert severity="info" sx={{ mb: 2 }}>
          {simulationResult.intentionallyNonDamaging
            ? "No enemy-damage payload."
            : simulationResult.unsupportedReasons.join(" ") || "No damage-simulation profile is available for this item."}
        </Alert>}
        <DamageProfileTable rows={simulationRows} showSource={false} />
      </Box>}
    </DialogContent>
  </Dialog>;
}
