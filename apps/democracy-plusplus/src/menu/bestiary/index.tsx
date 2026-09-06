import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Chip,
  Link,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useState, type SyntheticEvent } from "react";

import { BESTIARY } from "../../constants/enemies";
import type { Enemy, EnemyAnatomy, EnemyFaction } from "../../types";

const FACTIONS: EnemyFaction[] = ["Terminids", "Automatons", "Illuminate", "Super Earth"];
const WIKI_BASE_URL = "https://helldivers.wiki.gg/wiki";
const ARMOR_LABELS: Record<string, string> = {
  "0": "Unarmored",
  "1": "Very Light",
  "2": "Light",
  "3": "Medium",
  "4": "Heavy",
  "5": "Anti-Tank 1",
  "6": "Anti-Tank 2",
  "7": "Anti-Tank 3",
  "8": "Anti-Tank 4",
  "9": "Anti-Tank 5",
  "10": "Anti-Tank 6",
};

function armorDisplay(armor: string) {
  const label = ARMOR_LABELS[armor];
  return label ? `${armor} · ${label}` : armor || "—";
}

function AnatomyTable({ anatomy }: { anatomy: EnemyAnatomy }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>{anatomy.name}</Typography>
      <TableContainer>
        <Table size="small" aria-label={`${anatomy.name} anatomy`}>
          <TableHead>
            <TableRow>
              <TableCell>Body part</TableCell>
              <TableCell>Armor value</TableCell>
              <TableCell>Health</TableCell>
              <TableCell>Durability</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {anatomy.parts.map((part, index) => (
              <TableRow key={`${part.name}-${index}`}>
                <TableCell>{part.name}</TableCell>
                <TableCell>
                  <Typography variant="body2">{armorDisplay(part.armor)}</Typography>
                  {Object.entries(part.armorByDifficulty ?? {}).map(([difficulty, armor]) => (
                    <Typography color="text.secondary" key={difficulty} variant="caption" display="block">
                      Difficulty {difficulty}+: {armorDisplay(armor)}
                    </Typography>
                  ))}
                </TableCell>
                <TableCell>{part.health || "—"}</TableCell>
                <TableCell>{part.durability || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function EnemyEntry({ enemy }: { enemy: Enemy }) {
  const imageUrl = enemy.imageUrl
    ? `${import.meta.env.BASE_URL}images/${enemy.imageUrl}`
    : `${import.meta.env.BASE_URL}images/icons/skull-and-crossbones.svg`;

  return (
    <Accordion disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ alignItems: "center", display: "flex", gap: 2, minWidth: 0, width: "100%" }}>
          <Box
            component="img"
            src={imageUrl}
            alt=""
            sx={{ height: 64, objectFit: "contain", width: 64 }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6">{enemy.displayName}</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
              {enemy.enemyClass && <Chip label={enemy.enemyClass} size="small" />}
              {enemy.subfactions.map((subfaction) => (
                <Chip color="secondary" key={subfaction} label={subfaction} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Typography sx={{ mb: 1 }}>{enemy.description}</Typography>
        <Link
          href={`${WIKI_BASE_URL}/${enemy.wikiSlug}`}
          rel="noreferrer"
          target="_blank"
        >
          View source on Helldivers Wiki
        </Link>

        {enemy.variants.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Variants</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
              {enemy.variants.map((variant) => (
                <Chip
                  avatar={<Avatar alt="" src={`${import.meta.env.BASE_URL}images/${variant.imageUrl}`} />}
                  clickable
                  component="a"
                  href={`${WIKI_BASE_URL}/${variant.wikiSlug}`}
                  key={variant.wikiSlug}
                  label={variant.displayName}
                  rel="noreferrer"
                  target="_blank"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", lg: enemy.anatomy.length > 1 ? "repeat(2, minmax(0, 1fr))" : "1fr" },
            mt: 2,
          }}
        >
          {enemy.anatomy.map((anatomy) => (
            <AnatomyTable anatomy={anatomy} key={anatomy.name} />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

export default function Bestiary() {
  const [factionIndex, setFactionIndex] = useState(0);
  const [subfaction, setSubfaction] = useState("All");
  const faction = FACTIONS[factionIndex];
  const factionEnemies = BESTIARY.enemies.filter((enemy) => enemy.faction === faction);
  const subfactions = BESTIARY.subfactions[faction];
  const visibleEnemies = subfaction === "All"
    ? factionEnemies
    : factionEnemies.filter((enemy) => enemy.subfactions.includes(subfaction));

  function handleFactionChange(_event: SyntheticEvent, newValue: number) {
    setFactionIndex(newValue);
    setSubfaction("All");
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h5">Enemy Bestiary</Typography>
      <Tabs value={factionIndex} onChange={handleFactionChange} sx={{ borderBottom: 1, borderColor: "divider" }}>
        {FACTIONS.map((name) => <Tab key={name} label={name} />)}
      </Tabs>

      <ToggleButtonGroup
        exclusive
        value={subfaction}
        onChange={(_event, value: string | null) => value && setSubfaction(value)}
        sx={{ flexWrap: "wrap", my: 2 }}
      >
        <ToggleButton value="All">All</ToggleButton>
        {subfactions.map((name) => <ToggleButton key={name} value={name}>{name}</ToggleButton>)}
      </ToggleButtonGroup>

      <Typography color="text.secondary" sx={{ mb: 1 }}>
        {visibleEnemies.length} {visibleEnemies.length === 1 ? "enemy" : "enemies"}
      </Typography>
      {visibleEnemies.length === 0 && (
        <Typography color="text.secondary">
          The wiki does not currently publish a structured enemy roster for this subfaction.
        </Typography>
      )}
      {visibleEnemies.map((enemy) => <EnemyEntry enemy={enemy} key={enemy.wikiSlug} />)}
    </Box>
  );
}
