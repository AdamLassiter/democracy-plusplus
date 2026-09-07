import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Link, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, ToggleButton, Typography } from "@mui/material";
import { useEffect, useState, type SyntheticEvent } from "react";
import { useSelector } from "react-redux";
import { FACTIONS as MISSION_FACTIONS } from "../../constants/factions";
import { STRUCTURES } from "../../constants/structures";
import { selectMission } from "../../slices/missionSlice";
import type { CoverageState, Structure, StructureFaction } from "../../types";
import { structureCoverage } from "../../utils/capabilities";
import { PlannerControls } from "../planner/controls";
import { usePlannerLoadout } from "../planner/usePlannerLoadout";

const FACTIONS: StructureFaction[] = ["Neutral", "Terminids", "Automatons", "Illuminate", "Super Earth"];
const WIKI_BASE_URL = "https://helldivers.wiki.gg/wiki";
const COVERAGE_COLORS: Record<CoverageState, "error" | "warning" | "success"> = { none: "error", partial: "warning", full: "success" };
const DEMOLITION_VALUES = [...new Set(STRUCTURES.structures.flatMap((structure) => structure.targets.map((target) => target.demolitionForce)))].sort((a, b) => a - b);

function StructureEntry({ structure, loadout, expanded, onExpanded }: { structure: Structure; loadout: ReturnType<typeof usePlannerLoadout>; expanded: boolean; onExpanded: (_expanded: boolean) => void }) {
  const coverage = structureCoverage(structure.targets, loadout.capabilities);
  const image = structure.imageUrl || "icons/bank.svg";
  return <Accordion disableGutters expanded={expanded} id={`structure-${structure.id}`} onChange={(_event, value) => onExpanded(value)}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}><Box sx={{ alignItems: "center", display: "flex", gap: 2, width: "100%" }}>
      <Box component="img" src={`${import.meta.env.BASE_URL}images/${image}`} alt={structure.displayName} sx={{ height: 64, objectFit: "contain", width: 64 }} />
      <Box sx={{ flexGrow: 1 }}><Typography variant="h6">{structure.displayName}</Typography><Typography color="text.secondary" variant="body2">{structure.faction}</Typography></Box>
      {loadout.planner.mode === "planner" && <Chip color={COVERAGE_COLORS[coverage.state]} label={coverage.state} sx={{ textTransform: "capitalize" }} />}
    </Box></AccordionSummary>
    <AccordionDetails>
      <Typography sx={{ mb: 1 }}>{structure.description || "Destructible structure documented by the Helldivers Wiki."}</Typography>
      <Link href={`${WIKI_BASE_URL}/${structure.wikiSlug}`} rel="noreferrer" target="_blank">View source on Helldivers Wiki</Link>
      <Table size="small" sx={{ mt: 2 }}><TableHead><TableRow><TableCell>Target</TableCell><TableCell>Required demolition force</TableCell><TableCell>BaDR</TableCell>{loadout.planner.mode === "planner" && <TableCell>Coverage</TableCell>}</TableRow></TableHead>
        <TableBody>{coverage.targets.map(({ target, matchingItems, failureReason }) => <TableRow key={target.name}><TableCell>{target.name}</TableCell><TableCell>{target.demolitionForce}</TableCell><TableCell>{target.badr ? "Yes · explosive required" : "No"}</TableCell>{loadout.planner.mode === "planner" && <TableCell>{matchingItems.length ? matchingItems.join(", ") : failureReason}</TableCell>}</TableRow>)}</TableBody>
      </Table>
    </AccordionDetails>
  </Accordion>;
}

export default function Structures() {
  const mission = useSelector(selectMission);
  const loadout = usePlannerLoadout();
  const [selectedFaction, setSelectedFaction] = useState<StructureFaction | null>(null);
  const [search, setSearch] = useState("");
  const [selectedDemo, setSelectedDemo] = useState<number[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const faction = selectedFaction ?? MISSION_FACTIONS[mission.faction] ?? "Terminids";
  const query = search.trim().toLowerCase();
  const visibleStructures = STRUCTURES.structures.filter((structure) => {
    if (structure.faction !== faction) return false;
    if (query && ![structure.displayName, structure.description, structure.faction, ...structure.targets.map((item) => item.name)].some((value) => value.toLowerCase().includes(query))) return false;
    if (loadout.planner.mode === "browse" && selectedDemo.length && !structure.targets.some((item) => selectedDemo.includes(item.demolitionForce))) return false;
    const coverage = structureCoverage(structure.targets, loadout.capabilities).state;
    return loadout.planner.mode !== "planner" || !loadout.planner.structureCoverageFilters.length || loadout.planner.structureCoverageFilters.includes(coverage);
  });

  useEffect(() => { if (target) window.requestAnimationFrame(() => document.getElementById(`structure-${target}`)?.scrollIntoView({ behavior: "smooth", block: "start" })); }, [target]);
  function handleFactionChange(_event: SyntheticEvent, index: number) { setSelectedFaction(FACTIONS[index]); }
  function toggleDemo(value: number) { setSelectedDemo((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort((a, b) => a - b)); }

  return <Box sx={{ width: "100%" }}>
    <Typography variant="h5">Structures</Typography><Tabs value={FACTIONS.indexOf(faction)} onChange={handleFactionChange} variant="scrollable" scrollButtons="auto">{FACTIONS.map((name) => <Tab key={name} label={name} />)}</Tabs>
    <PlannerControls coverageKind="structure" loadout={loadout} />
    <TextField label="Search structures" onChange={(event) => setSearch(event.target.value)} size="small" sx={{ mb: 2 }} value={search} />
    {loadout.planner.mode === "browse" && <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2 }}>{DEMOLITION_VALUES.map((value) => <ToggleButton key={value} selected={selectedDemo.includes(value)} size="small" value={value} onClick={() => toggleDemo(value)}>DF {value}</ToggleButton>)}</Box>}
    <Typography color="text.secondary" sx={{ mb: 1 }}>{visibleStructures.length} {visibleStructures.length === 1 ? "structure" : "structures"}</Typography>{visibleStructures.length === 0 && <Typography color="text.secondary">No structures match the current filters.</Typography>}
    {visibleStructures.map((structure) => <StructureEntry expanded={target === structure.id} key={structure.id} loadout={loadout} onExpanded={(expanded) => setTarget(expanded ? structure.id : null)} structure={structure} />)}
  </Box>;
}
