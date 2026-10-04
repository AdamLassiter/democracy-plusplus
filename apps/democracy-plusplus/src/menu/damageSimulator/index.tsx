import {
  Alert,
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useSelector } from "react-redux";

import { BESTIARY } from "../../constants/enemies";
import { PRIMARIES } from "../../constants/primaries";
import { SECONDARIES } from "../../constants/secondaries";
import { selectMission } from "../../slices/missionSlice";
import type { Enemy, EnemyAnatomy, EnemyAnatomyPart, Item } from "../../types";
import { effectiveArmor } from "../../utils/capabilities";
import {
  effectiveEnemyHealth,
  enemyDifficultyRanges,
  normalizeEnemyTarget,
} from "../../utils/damage/enemyTargets";
import { calculateWeaponDps, simulateTargetTtk } from "../../utils/damage/simulator";
import type { WeaponProfile, WeaponProfileResult } from "../../utils/damage/types";
import { extractWeaponProfiles } from "../../utils/damage/weaponProfiles";
import { ItemIcon } from "../../utils/itemDisplay";

type WeaponOption = {
  item: Item;
  result: WeaponProfileResult;
};

const WEAPONS: WeaponOption[] = [...PRIMARIES, ...SECONDARIES]
  .map((item) => ({ item, result: extractWeaponProfiles(item) }))
  .sort((left, right) => {
    const categoryDifference = Number(left.item.category === "secondary")
      - Number(right.item.category === "secondary");
    return categoryDifference || left.item.displayName.localeCompare(right.item.displayName);
  });
const DEFAULT_WEAPON = WEAPONS.find(({ item }) => item.displayName === "AR-23 Liberator")
  ?? WEAPONS.find(({ result }) => result.profiles.length > 0)
  ?? WEAPONS[0];
const ENEMY_FACTION_ORDER = ["Terminids", "Automatons", "Illuminate", "Super Earth"] as const;
const ENEMIES = [...BESTIARY.enemies].sort((left, right) => {
  const factionDifference = ENEMY_FACTION_ORDER.indexOf(left.faction)
    - ENEMY_FACTION_ORDER.indexOf(right.faction);
  return factionDifference || left.displayName.localeCompare(right.displayName);
});

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function formatNumber(value: number | null | undefined, suffix = "") {
  return value === null || value === undefined ? "—" : `${numberFormatter.format(value)}${suffix}`;
}

function formatProfileKind(kind: WeaponProfile["kind"]) {
  const label = kind.replaceAll("-", " ");
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} profile`;
}

function weaponGroup(option: WeaponOption) {
  return option.item.category === "primary" ? "Primary" : "Secondary";
}

function WeaponPanel({ option, onChange, profileIndex, onProfileChange }: {
  option: WeaponOption;
  onChange: (_option: WeaponOption) => void;
  profileIndex: number;
  onProfileChange: (_index: number) => void;
}) {
  const profile = option.result.profiles[profileIndex] ?? option.result.profiles[0];
  const calculation = profile ? calculateWeaponDps(profile) : null;
  const component = profile?.components[0];
  const wikiUrl = option.item.wikiSlug
    ? `https://helldivers.wiki.gg/wiki/${option.item.wikiSlug}`
    : null;

  return <Card variant="outlined" sx={{ minWidth: 0 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>Weapon</Typography>
      <Autocomplete
        disableClearable
        getOptionLabel={({ item }) => item.displayName}
        groupBy={weaponGroup}
        isOptionEqualToValue={(candidate, value) => candidate.item.displayName === value.item.displayName}
        onChange={(_event, value) => onChange(value)}
        options={WEAPONS}
        renderInput={(params) => <TextField {...params} label="Weapon" />}
        renderOption={(props, candidate) => <li {...props} key={candidate.item.displayName}>
          <Box sx={{ alignItems: "center", display: "flex", gap: 1, justifyContent: "space-between", width: "100%" }}>
            <span>{candidate.item.displayName}</span>
            {candidate.result.profiles.length === 0 && <Chip label="Later class" size="small" variant="outlined" />}
          </Box>
        </li>}
        value={option}
      />
      {option.result.profiles.length > 1 && <FormControl fullWidth sx={{ mt: 1.5 }}>
        <InputLabel id="damage-sim-profile-label">Firing profile</InputLabel>
        <Select
          label="Firing profile"
          labelId="damage-sim-profile-label"
          onChange={(event) => onProfileChange(Number(event.target.value))}
          value={String(profileIndex)}
        >
          {option.result.profiles.map((candidate, index) => <MenuItem key={candidate.id} value={String(index)}>{candidate.label}</MenuItem>)}
        </Select>
      </FormControl>}

      <Box sx={{ alignItems: "center", display: "grid", gap: 2, gridTemplateColumns: "96px minmax(0, 1fr)", my: 2 }}>
        <ItemIcon
          item={option.item}
          bgcolor="black"
          height={72}
          objectFit="contain"
          width={96}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700}>{option.item.displayName}</Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
            <Chip label={weaponGroup(option)} size="small" />
            {profile && <Chip color="success" label={formatProfileKind(profile.kind)} size="small" />}
            {profile?.sourceVersion && <Chip label={`Wiki ${profile.sourceVersion}`} size="small" variant="outlined" />}
          </Stack>
          {wikiUrl && <Link href={wikiUrl} rel="noreferrer" target="_blank" variant="body2">View source on Helldivers Wiki</Link>}
        </Box>
      </Box>

      {!profile && <Alert severity="info">
        <Typography fontWeight={700}>Not simulated by the first weapon class</Typography>
        {option.result.unsupportedReasons.map((reason) => <Typography key={reason} variant="body2">{reason}</Typography>)}
      </Alert>}

      {profile && calculation && <>
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2 }}>
          <Chip label={`${formatNumber(profile.roundsPerMinute)} rpm`} />
          <Chip label={profile.infiniteCapacity
            ? "Infinite cycle"
            : profile.firingDurationSeconds === undefined
              ? `${formatNumber(profile.capacity)} rounds`
              : `${formatNumber(profile.firingDurationSeconds)}s ${profile.kind === "spray" ? "fuel cycle" : "to overheat"}`}
          />
          <Chip label={`AP ${component?.armorPenetration ?? "—"}`} />
          <Chip label={profile.reload?.emptySeconds !== undefined
            ? `${formatNumber(profile.reload.emptySeconds)}s reload`
            : profile.reload?.perRoundSeconds !== undefined
              ? `${formatNumber(profile.reload.perRoundSeconds)}s per round`
              : "Reload unknown"}
          />
        </Stack>
        {profile.components.length > 1 && <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2 }}>
          {profile.components.map((damageComponent) => <Chip
            key={damageComponent.id}
            label={`${damageComponent.kind}: ${formatNumber(damageComponent.standardDamage * damageComponent.packetsPerShot)} ${damageComponent.damageType}, AP ${damageComponent.armorPenetration}`}
            size="small"
            variant="outlined"
          />)}
        </Stack>}
        <TableContainer><Table size="small" aria-label="Weapon damage output">
          <TableHead><TableRow>
            <TableCell>Damage basis</TableCell>
            <TableCell align="right">Per trigger</TableCell>
            <TableCell align="right">Burst DPS</TableCell>
            <TableCell align="right">Magazine</TableCell>
            <TableCell align="right">Sustained DPS</TableCell>
          </TableRow></TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Standard</TableCell>
              <TableCell align="right">{formatNumber(calculation.damagePerTrigger.standard)}</TableCell>
              <TableCell align="right">{formatNumber(calculation.burstDps.standard)}</TableCell>
              <TableCell align="right">{formatNumber(calculation.magazineDamage.standard)}</TableCell>
              <TableCell align="right">{formatNumber(calculation.sustainedDps?.standard)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>100% durable</TableCell>
              <TableCell align="right">{formatNumber(calculation.damagePerTrigger.durable)}</TableCell>
              <TableCell align="right">{formatNumber(calculation.burstDps.durable)}</TableCell>
              <TableCell align="right">{formatNumber(calculation.magazineDamage.durable)}</TableCell>
              <TableCell align="right">{formatNumber(calculation.sustainedDps?.durable)}</TableCell>
            </TableRow>
          </TableBody>
        </Table></TableContainer>
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 2 }}>
          {calculation.timeToEmptySeconds !== null && <Chip label={`Time to empty ${formatNumber(calculation.timeToEmptySeconds, "s")}`} size="small" variant="outlined" />}
          {calculation.cycleSeconds !== null && <Chip label={`Cycle ${formatNumber(calculation.cycleSeconds, "s")}`} size="small" variant="outlined" />}
          {profile.warmupSeconds !== undefined && <Chip label={`Warmup ${formatNumber(profile.warmupSeconds, "s")}`} size="small" variant="outlined" />}
          {profile.firingModes.map((mode) => <Chip key={mode} label={mode} size="small" variant="outlined" />)}
        </Stack>
        {calculation.warnings.map((warning) => <Alert key={warning} severity="warning" sx={{ mt: 1 }}>{warning}</Alert>)}
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2">Assumptions</Typography>
        {profile.assumptions.map((assumption) => <Typography color="text.secondary" key={assumption} variant="body2">• {assumption}</Typography>)}
      </>}
    </CardContent>
  </Card>;
}

function EnemyPanel({ profile }: { profile: WeaponProfile | null }) {
  const mission = useSelector(selectMission);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [anatomy, setAnatomy] = useState<EnemyAnatomy | null>(null);
  const [part, setPart] = useState<EnemyAnatomyPart | null>(null);
  const [difficulty, setDifficulty] = useState(mission.difficulty + 1);
  const [hitRate, setHitRate] = useState(100);
  const difficultyRanges = enemy ? enemyDifficultyRanges(enemy) : [];
  const selectedDifficultyRange = difficultyRanges.find(({ minimum, maximum }) =>
    difficulty >= minimum && difficulty <= maximum,
  );
  const targetResult = enemy && anatomy && part
    ? normalizeEnemyTarget(enemy, anatomy, part, difficulty)
    : null;
  const ttk = profile && targetResult?.target
    ? simulateTargetTtk(profile, targetResult.target)
    : null;
  const practicalTtk = hitRate < 100 && profile && targetResult?.target
    ? simulateTargetTtk(profile, targetResult.target, { hitRate: hitRate / 100 })
    : null;

  function chooseEnemy(value: Enemy | null) {
    const nextAnatomy = value?.anatomy[0] ?? null;
    setEnemy(value);
    setAnatomy(nextAnatomy);
    setPart(nextAnatomy?.parts.find((candidate) => candidate.name === "Main") ?? nextAnatomy?.parts[0] ?? null);
  }

  function chooseAnatomy(name: string) {
    const nextAnatomy = enemy?.anatomy.find((candidate) => candidate.name === name) ?? null;
    setAnatomy(nextAnatomy);
    setPart(nextAnatomy?.parts.find((candidate) => candidate.name === "Main") ?? nextAnatomy?.parts[0] ?? null);
  }

  return <Card variant="outlined" sx={{ minWidth: 0 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>Enemy target</Typography>
      <Autocomplete
        getOptionLabel={(option) => option.displayName}
        groupBy={(option) => option.faction}
        isOptionEqualToValue={(candidate, value) => candidate.wikiSlug === value.wikiSlug}
        onChange={(_event, value) => chooseEnemy(value)}
        options={ENEMIES}
        renderInput={(params) => <TextField {...params} label="Enemy (optional)" />}
        value={enemy}
      />
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, mt: 2 }}>
        <FormControl disabled={!enemy} fullWidth>
          <InputLabel id="damage-sim-anatomy-label">Anatomy</InputLabel>
          <Select
            label="Anatomy"
            labelId="damage-sim-anatomy-label"
            onChange={(event) => chooseAnatomy(event.target.value)}
            value={anatomy?.name ?? ""}
          >
            {(enemy?.anatomy ?? []).map((candidate) => <MenuItem key={candidate.name} value={candidate.name}>{candidate.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl disabled={!anatomy} fullWidth>
          <InputLabel id="damage-sim-part-label">Body part</InputLabel>
          <Select
            label="Body part"
            labelId="damage-sim-part-label"
            onChange={(event) => setPart(anatomy?.parts.find((candidate) => candidate.name === event.target.value) ?? null)}
            value={part?.name ?? ""}
          >
            {(anatomy?.parts ?? []).map((candidate, index) => <MenuItem key={`${candidate.name}-${index}`} value={candidate.name}>{candidate.name}</MenuItem>)}
          </Select>
        </FormControl>
        {difficultyRanges.length > 1 && <FormControl fullWidth>
          <InputLabel id="damage-sim-difficulty-label">Difficulty</InputLabel>
          <Select
            label="Difficulty"
            labelId="damage-sim-difficulty-label"
            onChange={(event) => setDifficulty(Number(event.target.value))}
            value={String(selectedDifficultyRange?.minimum ?? difficultyRanges[0]?.minimum ?? difficulty)}
          >
            {difficultyRanges.map(({ minimum, maximum }) => <MenuItem key={minimum} value={String(minimum)}>
              {minimum === maximum ? minimum : `${minimum}-${maximum}`}
            </MenuItem>)}
          </Select>
        </FormControl>}
      </Box>

      {enemy && <Box sx={{ alignItems: "center", display: "flex", gap: 2, my: 2 }}>
        <Box
          alt=""
          component="img"
          src={`${import.meta.env.BASE_URL}images/${enemy.imageUrl}`}
          sx={{ height: 72, objectFit: "contain", width: 96 }}
        />
        <Box>
          <Typography fontWeight={700}>{enemy.displayName}</Typography>
          <Link href={`https://helldivers.wiki.gg/wiki/${enemy.wikiSlug}`} rel="noreferrer" target="_blank" variant="body2">View source on Helldivers Wiki</Link>
        </Box>
      </Box>}

      {part && <>
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2 }}>
          <Chip label={`AV ${effectiveArmor(part, difficulty)}`} />
          <Chip label={`Health ${effectiveEnemyHealth(part, difficulty) ?? (part.health || "—")}`} />
          <Chip label={`Durability ${part.durability || "—"}`} />
          {part.percentToMain !== undefined && <Chip label={`${formatNumber(part.percentToMain * 100)}% to Main`} />}
          {part.damageToMainCapped !== undefined && <Chip label={part.damageToMainCapped ? "Overflow capped" : "Overkill transfers"} />}
          {part.fatal !== undefined && <Chip color={part.fatal ? "error" : "default"} label={part.fatal ? "Fatal" : "Non-fatal"} />}
          {part.explosionResistance !== undefined && <Chip label={`${formatNumber(part.explosionResistance * 100)}% ExDR`} />}
          {part.demolitionForce !== undefined && <Chip label={`DF ${part.demolitionForce}`} />}
        </Stack>
        {part.bleedDescription && part.bleedDescription !== "None" && <Alert severity="info" sx={{ mb: 1 }}>
          Constitution: {part.bleedDescription}
        </Alert>}
        <Box sx={{ px: 1, py: 0.5 }}>
          <Typography id="damage-sim-hit-rate" variant="subtitle2">Practical hit rate: {hitRate}%</Typography>
          <Slider
            aria-labelledby="damage-sim-hit-rate"
            marks={[{ value: 25, label: "25%" }, { value: 50, label: "50%" }, { value: 75, label: "75%" }, { value: 100, label: "100%" }]}
            max={100}
            min={25}
            onChange={(_event, value) => setHitRate(value as number)}
            step={5}
            value={hitRate}
          />
        </Box>
        {targetResult && targetResult.unsupportedReasons.length > 0 && <Alert severity="warning">
          <Typography fontWeight={700}>This target cannot be simulated yet</Typography>
          {targetResult.unsupportedReasons.map((reason) => <Typography key={reason} variant="body2">{reason}</Typography>)}
        </Alert>}
        {!profile && <Alert severity="info">Choose a supported weapon to calculate target TTK.</Alert>}
        {ttk && <>
          <Alert severity={ttk.status === "killed" ? "success" : ttk.status === "no-damage" ? "error" : "warning"}>
            <Typography fontWeight={700}>
              {ttk.status === "killed"
                ? `Optimal TTK ${formatNumber(ttk.timeToKillSeconds, "s")}`
                : ttk.status === "part-destroyed"
                  ? "Part destroyed; enemy survives"
                  : ttk.status === "no-damage"
                    ? "No damage"
                    : "TTK unavailable"}
            </Typography>
            {ttk.killCondition && <Typography variant="body2">Kill condition: {ttk.killCondition.replaceAll("-", " ")}</Typography>}
          </Alert>
          {practicalTtk && <Alert severity={practicalTtk.status === "killed" ? "info" : "warning"} sx={{ mt: 1 }}>
            <Typography fontWeight={700}>
              Practical expected TTK: {practicalTtk.timeToKillSeconds === null
                ? practicalTtk.status.replace("-", " ")
                : formatNumber(practicalTtk.timeToKillSeconds, "s")}
            </Typography>
            <Typography variant="body2">
              {hitRate}% hit rate · {practicalTtk.shots} trigger pulls · {practicalTtk.reloads} reloads
            </Typography>
          </Alert>}
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ my: 1.5 }}>
            <Chip label={`${ttk.shots} trigger pull${ttk.shots === 1 ? "" : "s"}`} />
            <Chip label={`${ttk.reloads} reload${ttk.reloads === 1 ? "" : "s"}`} />
            <Chip label={`${ttk.damagePerTrigger.part} part damage / trigger`} />
            <Chip label={`${ttk.damagePerTrigger.main} Main damage / trigger`} />
            {ttk.timeToDownSeconds !== null && ttk.bleedoutSeconds !== null && <Chip label={`Down ${formatNumber(ttk.timeToDownSeconds, "s")}; bleedout ${formatNumber(ttk.bleedoutSeconds, "s")}`} />}
          </Stack>
          <TableContainer><Table size="small" aria-label="Target damage calculation">
            <TableHead><TableRow>
              <TableCell>Component</TableCell>
              <TableCell align="right">Blend</TableCell>
              <TableCell align="right">Armor</TableCell>
              <TableCell align="right">Per packet</TableCell>
              <TableCell align="right">Packets</TableCell>
              <TableCell align="right">To Main</TableCell>
            </TableRow></TableHead>
            <TableBody>{ttk.trace.map((entry) => <TableRow key={entry.componentId}>
              <TableCell>{entry.componentId}</TableCell>
              <TableCell align="right">{formatNumber(entry.blendedDamage)}</TableCell>
              <TableCell align="right">{formatNumber(entry.armorMultiplier * 100, "%")}</TableCell>
              <TableCell align="right">{entry.damagePerPacket}</TableCell>
              <TableCell align="right">{entry.packets}</TableCell>
              <TableCell align="right">{entry.mainDamage}</TableCell>
            </TableRow>)}</TableBody>
          </Table></TableContainer>
          {ttk.warnings.map((warning) => <Alert key={warning} severity="warning" sx={{ mt: 1 }}>{warning}</Alert>)}
        </>}
      </>}
      {!enemy && <Typography color="text.secondary">
        Choose an enemy to inspect the target that will be used by the body-part TTK model.
      </Typography>}
    </CardContent>
  </Card>;
}

export default function DamageSimulator() {
  const [weapon, setWeapon] = useState(DEFAULT_WEAPON);
  const [profileIndex, setProfileIndex] = useState(0);
  const supported = WEAPONS.filter(({ result }) => result.profiles.length > 0).length;
  const sustained = WEAPONS.filter(({ result }) => {
    const reload = result.profiles[0]?.reload;
    return result.profiles[0]?.infiniteCapacity === true
      || reload?.emptySeconds !== undefined
      || reload?.perRoundSeconds !== undefined;
  }).length;

  if (!weapon) return <Alert severity="error">No weapons are available to simulate.</Alert>;
  const profile = weapon.result.profiles[profileIndex] ?? weapon.result.profiles[0] ?? null;

  function chooseWeapon(option: WeaponOption) {
    setWeapon(option);
    setProfileIndex(0);
  }

  return <Box sx={{ minWidth: 0, width: "100%" }}>
    <Typography variant="h5">Damage Simulator</Typography>
    <Typography color="text.secondary" sx={{ mb: 2 }}>
      Point-blank theoretical output using detailed wiki attack data. {supported} of {WEAPONS.length} weapons currently have a damage profile; {sustained} include reload-aware or continuous sustained DPS.
    </Typography>
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" } }}>
      <WeaponPanel
        onChange={chooseWeapon}
        onProfileChange={setProfileIndex}
        option={weapon}
        profileIndex={profileIndex}
      />
      <EnemyPanel profile={profile} />
    </Box>
  </Box>;
}
