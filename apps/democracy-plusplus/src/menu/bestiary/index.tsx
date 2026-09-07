import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Avatar, Box, Chip, FormControl, InputLabel, Link, MenuItem, Select, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useEffect, useState, type SyntheticEvent } from "react";
import { useSelector } from "react-redux";
import { BESTIARY } from "../../constants/enemies";
import { FACTIONS as MISSION_FACTIONS } from "../../constants/factions";
import { selectMission } from "../../slices/missionSlice";
import type { Enemy, EnemyAnatomy, EnemyCoverageState, EnemyFaction } from "../../types";
import { anatomyCoverage, ARMOR_LABELS, bestEnemyCoverage, effectiveArmor, enemyAnatomyCoverageState } from "../../utils/capabilities";
import { PlannerControls } from "../planner/controls";
import { usePlannerLoadout } from "../planner/usePlannerLoadout";

const FACTIONS: EnemyFaction[] = ["Terminids", "Automatons", "Illuminate", "Super Earth"];
const WIKI_BASE_URL = "https://helldivers.wiki.gg/wiki";
const ARMOR_VALUES = Object.keys(ARMOR_LABELS).map(Number);
const COVERAGE_COLORS: Record<EnemyCoverageState, "error" | "warning" | "info" | "success"> = {
  none: "error",
  partialResisted: "warning",
  partial: "info",
  fullResisted: "warning",
  full: "success",
};
const COVERAGE_LABELS: Record<EnemyCoverageState, string> = {
  none: "None",
  partialResisted: "Partial (Resisted)",
  partial: "Partial",
  fullResisted: "Full (Resisted)",
  full: "Full",
};

function armorDisplay(armor: number) {
  return `${armor} · ${ARMOR_LABELS[armor] ?? "Unknown"}`;
}

function AnatomyTable({ anatomy, difficulty, plannerMode, capabilities }: {
  anatomy: EnemyAnatomy;
  difficulty: number;
  plannerMode: boolean;
  capabilities: ReturnType<typeof usePlannerLoadout>["capabilities"];
}) {
  const coverage = anatomyCoverage(anatomy, capabilities, difficulty);
  const coverageState = enemyAnatomyCoverageState(anatomy, capabilities, difficulty);
  return <Box sx={{ minWidth: 0 }}>
    <Box sx={{ alignItems: "center", display: "flex", gap: 1, mb: 0.5 }}>
      <Typography variant="subtitle1">{anatomy.name}</Typography>
      {plannerMode && <Chip color={COVERAGE_COLORS[coverageState]} label={COVERAGE_LABELS[coverageState]} size="small" />}
    </Box>
    <TableContainer><Table size="small" aria-label={`${anatomy.name} anatomy`}>
      <TableHead><TableRow><TableCell>Body part</TableCell><TableCell>Armor value</TableCell><TableCell>Health</TableCell><TableCell>Durability</TableCell>{plannerMode && <TableCell>Coverage</TableCell>}</TableRow></TableHead>
      <TableBody>{coverage.parts.map(({ part, armor, matchingItems }, index) => <TableRow key={`${part.name}-${index}`}>
        <TableCell>{part.name}</TableCell><TableCell><Typography variant="body2">{armorDisplay(armor)}</Typography>{Object.entries(part.armorByDifficulty ?? {}).map(([minimum, value]) => <Typography color="text.secondary" key={minimum} variant="caption" display="block">Difficulty {minimum}+: {armorDisplay(Number(value))}</Typography>)}</TableCell>
        <TableCell>{part.health || "—"}</TableCell><TableCell>{part.durability || "—"}</TableCell>{plannerMode && <TableCell>{matchingItems.length ? matchingItems.join(", ") : "No enabled item"}</TableCell>}
      </TableRow>)}</TableBody>
    </Table></TableContainer>
  </Box>;
}

function enemyCoverageState(enemy: Enemy, difficulty: number, capabilities: ReturnType<typeof usePlannerLoadout>["capabilities"]) {
  return bestEnemyCoverage(enemy.anatomy.map((anatomy) => enemyAnatomyCoverageState(anatomy, capabilities, difficulty)));
}

function EnemyEntry({ enemy, difficulty, loadout, expanded, onExpanded }: { enemy: Enemy; difficulty: number; loadout: ReturnType<typeof usePlannerLoadout>; expanded: boolean; onExpanded: (_expanded: boolean) => void }) {
  const imageUrl = enemy.imageUrl ? `${import.meta.env.BASE_URL}images/${enemy.imageUrl}` : `${import.meta.env.BASE_URL}images/icons/skull-and-crossbones.svg`;
  const state = enemyCoverageState(enemy, difficulty, loadout.capabilities);
  return <Accordion disableGutters expanded={expanded} onChange={(_event, value) => onExpanded(value)} id={`enemy-${enemy.wikiSlug}`}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}><Box sx={{ alignItems: "center", display: "flex", gap: 2, minWidth: 0, width: "100%" }}>
      <Box component="img" src={imageUrl} alt={enemy.displayName} sx={{ height: 64, objectFit: "contain", width: 64 }} />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}><Typography variant="h6">{enemy.displayName}</Typography><Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>{enemy.enemyClass && <Chip label={enemy.enemyClass} size="small" />}{enemy.subfactions.map((name) => <Chip color="secondary" key={name} label={name} size="small" variant="outlined" />)}</Box></Box>
      {loadout.planner.mode === "planner" && <Chip color={COVERAGE_COLORS[state]} label={COVERAGE_LABELS[state]} />}
    </Box></AccordionSummary>
    <AccordionDetails><Typography sx={{ mb: 1 }}>{enemy.description}</Typography><Link href={`${WIKI_BASE_URL}/${enemy.wikiSlug}`} rel="noreferrer" target="_blank">View source on Helldivers Wiki</Link>
      {enemy.variants.length > 0 && <Box sx={{ mt: 2 }}><Typography variant="subtitle1">Variants</Typography><Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>{enemy.variants.map((variant) => <Chip avatar={<Avatar alt="" src={`${import.meta.env.BASE_URL}images/${variant.imageUrl}`} />} clickable component="a" href={`${WIKI_BASE_URL}/${variant.wikiSlug}`} key={variant.wikiSlug} label={variant.displayName} rel="noreferrer" target="_blank" variant="outlined" />)}</Box></Box>}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: enemy.anatomy.length > 1 ? "repeat(2, minmax(0, 1fr))" : "1fr" }, mt: 2 }}>{enemy.anatomy.map((anatomy) => <AnatomyTable anatomy={anatomy} capabilities={loadout.capabilities} difficulty={difficulty} key={anatomy.name} plannerMode={loadout.planner.mode === "planner"} />)}</Box>
    </AccordionDetails>
  </Accordion>;
}

export default function Bestiary() {
  const mission = useSelector(selectMission);
  const loadout = usePlannerLoadout();
  const [selectedFaction, setSelectedFaction] = useState<EnemyFaction | null>(null);
  const [subfaction, setSubfaction] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedArmor, setSelectedArmor] = useState<number[]>([]);
  const [difficultyOverride, setDifficultyOverride] = useState<number | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const faction = selectedFaction ?? MISSION_FACTIONS[mission.faction] ?? "Terminids";
  const difficulty = difficultyOverride ?? mission.difficulty + 1;
  const query = search.trim().toLowerCase();
  const visibleEnemies = BESTIARY.enemies.filter((enemy) => {
    if (enemy.faction !== faction || (subfaction !== "All" && !enemy.subfactions.includes(subfaction))) return false;
    if (query && ![enemy.displayName, enemy.description, enemy.enemyClass, ...enemy.subfactions, ...enemy.variants.map((variant) => variant.displayName), ...enemy.anatomy.flatMap((anatomy) => anatomy.parts.map((part) => part.name))].some((value) => value.toLowerCase().includes(query))) return false;
    if (loadout.planner.mode === "browse" && selectedArmor.length && !enemy.anatomy.some((anatomy) => anatomy.parts.some((part) => selectedArmor.includes(effectiveArmor(part, difficulty))))) return false;
    if (loadout.planner.mode === "planner" && loadout.planner.enemyCoverageFilters.length && !loadout.planner.enemyCoverageFilters.includes(enemyCoverageState(enemy, difficulty, loadout.capabilities))) return false;
    return true;
  });

  useEffect(() => { if (target) window.requestAnimationFrame(() => document.getElementById(`enemy-${target}`)?.scrollIntoView({ behavior: "smooth", block: "start" })); }, [target]);
  function toggleArmor(value: number) { setSelectedArmor((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort((a, b) => a - b)); }
  function handleFactionChange(_event: SyntheticEvent, index: number) { setSelectedFaction(FACTIONS[index]); setSubfaction("All"); }

  return <Box sx={{ width: "100%" }}>
    <Typography variant="h5">Enemy Bestiary</Typography><Tabs value={FACTIONS.indexOf(faction)} onChange={handleFactionChange} variant="scrollable" scrollButtons="auto">{FACTIONS.map((name) => <Tab key={name} label={name} />)}</Tabs>
    <PlannerControls coverageKind="enemy" loadout={loadout} />
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}><TextField label="Search enemies" onChange={(event) => setSearch(event.target.value)} size="small" value={search} /><FormControl size="small" sx={{ minWidth: 150 }}><InputLabel id="enemy-difficulty-label">Difficulty</InputLabel><Select label="Difficulty" labelId="enemy-difficulty-label" value={difficultyOverride === null ? "mission" : String(difficultyOverride)} onChange={(event) => setDifficultyOverride(event.target.value === "mission" ? null : Number(event.target.value))}><MenuItem value="mission">Mission ({mission.difficulty + 1})</MenuItem>{Array.from({ length: 10 }, (_, index) => <MenuItem key={index + 1} value={String(index + 1)}>{index + 1}</MenuItem>)}</Select></FormControl></Box>
    <ToggleButtonGroup exclusive value={subfaction} onChange={(_event, value: string | null) => value && setSubfaction(value)} sx={{ flexWrap: "wrap", mb: 2 }} size="small"><ToggleButton value="All">All</ToggleButton>{BESTIARY.subfactions[faction].map((name) => <ToggleButton key={name} value={name}>{name}</ToggleButton>)}</ToggleButtonGroup>
    {loadout.planner.mode === "browse" && <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2 }}>{ARMOR_VALUES.map((value) => <ToggleButton key={value} selected={selectedArmor.includes(value)} size="small" value={value} onClick={() => toggleArmor(value)}>{value} · {ARMOR_LABELS[value]}</ToggleButton>)}</Box>}
    <Typography color="text.secondary" sx={{ mb: 1 }}>{visibleEnemies.length} {visibleEnemies.length === 1 ? "enemy" : "enemies"}</Typography>{visibleEnemies.length === 0 && <Typography color="text.secondary">No enemies match the current filters.</Typography>}
    {visibleEnemies.map((enemy) => <EnemyEntry difficulty={difficulty} enemy={enemy} expanded={target === enemy.wikiSlug} key={enemy.wikiSlug} loadout={loadout} onExpanded={(expanded) => setTarget(expanded ? enemy.wikiSlug : null)} />)}
  </Box>;
}
