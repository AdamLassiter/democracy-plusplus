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
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { BESTIARY } from "../../constants/enemies";
import { selectMission } from "../../slices/missionSlice";
import type { Enemy, EnemyAnatomy, EnemyAnatomyPart } from "../../types";
import { effectiveArmor } from "../../utils/capabilities";
import {
  effectiveEnemyHealth,
  enemyDifficultyRanges,
  normalizeEnemyTarget,
} from "../../utils/damage/enemyTargets";
import {
  calculateWeaponDps,
  simulateTargetTtk,
} from "../../utils/damage/simulator";
import { profileForExposure } from "../../utils/damage/stratagemProfiles";
import type { CombatSourceProfile } from "../../utils/damage/types";
import {
  combatSourceGroup,
  type CombatSourceOption,
  usesBoundedExposure,
} from "../../utils/damage/combatSourceCatalog";
import { ItemIcon } from "../../utils/itemDisplay";
import SectionHeading from "../../utils/sectionHeading";
import { BrowsePlannerToggle } from "../planner/controls";
import DamageSimulatorBrowse from "./browse";
import { COMBAT_SOURCES } from "./catalog";
import { ImpactScenarioSelector } from "./impactScenarioSelector";
import { humanizeProfileKind } from "./labels";
import { ProfileSelector } from "./profileSelector";
const DEFAULT_WEAPON =
  COMBAT_SOURCES.find(({ item }) => item.displayName === "AR-23 Liberator") ??
  COMBAT_SOURCES.find(({ result }) => result.profiles.length > 0) ??
  COMBAT_SOURCES[0];
const ENEMY_FACTION_ORDER = [
  "Terminids",
  "Automatons",
  "Illuminate",
  "Super Earth",
] as const;
const ENEMIES = [...BESTIARY.enemies].sort((left, right) => {
  const factionDifference =
    ENEMY_FACTION_ORDER.indexOf(left.faction) -
    ENEMY_FACTION_ORDER.indexOf(right.faction);
  return factionDifference || left.displayName.localeCompare(right.displayName);
});

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

function formatNumber(value: number | null | undefined, suffix = "") {
  return value === null || value === undefined
    ? "—"
    : `${numberFormatter.format(value)}${suffix}`;
}

function WeaponPanel({
  option,
  onChange,
  profileIndex,
  onProfileChange,
  exposureIndex,
  onExposureChange,
}: {
  option: CombatSourceOption;
  onChange: (_option: CombatSourceOption) => void;
  profileIndex: number;
  onProfileChange: (_index: number) => void;
  exposureIndex: number;
  onExposureChange: (_index: number) => void;
}) {
  const profile =
    option.result.profiles[profileIndex] ?? option.result.profiles[0];
  const calculation = profile ? calculateWeaponDps(profile) : null;
  const exposure =
    profile?.delivery.exposureScenarios[exposureIndex] ??
    profile?.delivery.exposureScenarios[0];
  const exposedProfile =
    profile && exposure && usesBoundedExposure(profile)
      ? profileForExposure(profile, exposure)
      : profile;
  const exposedCalculation = exposedProfile
    ? calculateWeaponDps(exposedProfile)
    : null;
  const perPayloadCalculation =
    profile &&
    profile.sourceKind === "stratagem" &&
    usesBoundedExposure(profile)
      ? calculateWeaponDps(
          profileForExposure(profile, {
            id: "per-payload",
            label: "1 payload",
            payloadHits: 1,
            confidence: "sourced",
          }),
        )
      : null;
  const activeStatusDps =
    perPayloadCalculation?.statuses.reduce(
      (total, status) => total + status.damagePerSecond.standard,
      0,
    ) ?? 0;
  const chargeComparisons =
    option.result.profiles.length > 1 &&
    option.result.profiles.every(({ kind }) => kind === "charge")
      ? option.result.profiles.map((candidate) => ({
          profile: candidate,
          calculation: calculateWeaponDps(candidate),
        }))
      : [];
  const bestChargeTrigger = chargeComparisons.reduce<
    (typeof chargeComparisons)[number] | null
  >(
    (best, candidate) =>
      !best ||
      candidate.calculation.damagePerTrigger.standard >
        best.calculation.damagePerTrigger.standard
        ? candidate
        : best,
    null,
  );
  const bestChargeSustained = chargeComparisons.reduce<
    (typeof chargeComparisons)[number] | null
  >(
    (best, candidate) =>
      candidate.calculation.sustainedDps &&
      (!best ||
        candidate.calculation.sustainedDps.standard >
          (best.calculation.sustainedDps?.standard ?? 0))
        ? candidate
        : best,
    null,
  );
  const component = profile?.components[0];
  const configuredProjectilesPerTrigger =
    profile?.trigger.ammoPerTrigger === "remaining"
      ? profile.resource.capacity
      : profile?.trigger.projectileEvents.reduce(
          (total, event) => total + event.projectiles,
          0,
        );
  const triggerWindowSeconds =
    profile?.trigger.ammoPerTrigger === "remaining"
      ? Math.max(0, profile.resource.capacity - 1) *
        (profile.trigger.remainingProjectileIntervalSeconds ?? 0)
      : (profile?.trigger.projectileEvents.reduce(
          (maximum, event) => Math.max(maximum, event.offsetSeconds),
          0,
        ) ?? 0);
  const wikiUrl = option.item.wikiSlug
    ? `https://helldivers.wiki.gg/wiki/${option.item.wikiSlug}`
    : null;

  return (
    <Card variant="outlined" sx={{ minWidth: 0 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Combat source
        </Typography>
        <Autocomplete
          disableClearable
          getOptionLabel={({ item }) => item.displayName}
          groupBy={combatSourceGroup}
          isOptionEqualToValue={(candidate, value) =>
            candidate.item.displayName === value.item.displayName
          }
          onChange={(_event, value) => onChange(value)}
          options={COMBAT_SOURCES}
          renderInput={(params) => (
            <TextField {...params} label="Combat source" />
          )}
          renderOption={(props, candidate) => (
            <li {...props} key={candidate.item.displayName}>
              <Box
                sx={{
                  alignItems: "center",
                  display: "flex",
                  gap: 1,
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <span>{candidate.item.displayName}</span>
                {candidate.result.profiles.length === 0 && (
                  <Chip label="Unsupported" size="small" variant="outlined" />
                )}
              </Box>
            </li>
          )}
          value={option}
        />
        <ProfileSelector
          label={
            option.item.tags?.includes("Vehicles") ||
            option.item.tags?.includes("Sentry") ||
            option.item.tags?.includes("Emplacement")
              ? "Weapon"
              : "Firing profile"
          }
          onChange={onProfileChange}
          profiles={option.result.profiles}
          selectedIndex={profileIndex}
        />
        {profile?.sourceKind === "stratagem" &&
          exposure &&
          usesBoundedExposure(profile) &&
          (profile.delivery.exposureScenarios.length > 1 ||
            exposure.payloadHits !== profile.delivery.totalPayloads) && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="damage-sim-exposure-label">
                Target exposure
              </InputLabel>
              <Select
                label="Target exposure"
                labelId="damage-sim-exposure-label"
                onChange={(event) =>
                  onExposureChange(Number(event.target.value))
                }
                value={String(
                  Math.min(
                    exposureIndex,
                    profile.delivery.exposureScenarios.length - 1,
                  ),
                )}
              >
                {profile.delivery.exposureScenarios.map((scenario, index) => (
                  <MenuItem key={scenario.id} value={String(index)}>
                    {scenario.label} · {scenario.confidence}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

        <Box
          sx={{
            alignItems: "center",
            display: "grid",
            gap: 2,
            gridTemplateColumns: "96px minmax(0, 1fr)",
            my: 2,
          }}
        >
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
              <Chip label={combatSourceGroup(option)} size="small" />
              {profile && (
                <Chip
                  color="success"
                  label={humanizeProfileKind(profile.kind)}
                  size="small"
                />
              )}
              {profile?.sourceKind === "stratagem" && (
                <Chip
                  label={profile.delivery.kind.replaceAll("-", " ")}
                  size="small"
                  variant="outlined"
                />
              )}
              {profile?.sourceKind === "stratagem" && (
                <Chip
                  label={profile.delivery.control.replaceAll("-", " ")}
                  size="small"
                  variant="outlined"
                />
              )}
              {profile?.sourceVersion && (
                <Chip
                  label={`Wiki ${profile.sourceVersion}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
            {wikiUrl && (
              <Link
                href={wikiUrl}
                rel="noreferrer"
                target="_blank"
                variant="body2"
              >
                View source on Helldivers Wiki
              </Link>
            )}
          </Box>
        </Box>

        {!profile && (
          <Alert severity="info">
            <Typography fontWeight={700}>
              {option.result.intentionallyNonDamaging
                ? "No enemy-damage payload"
                : "Unsupported"}
            </Typography>
            {option.result.unsupportedReasons.map((reason) => (
              <Typography key={reason} variant="body2">
                {reason}
              </Typography>
            ))}
          </Alert>
        )}

        {profile && calculation && (
          <>
            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2 }}>
              {profile.sourceKind === "stratagem" && (
                <Chip
                  label={`${profile.delivery.totalPayloads} total payload${profile.delivery.totalPayloads === 1 ? "" : "s"}`}
                />
              )}
              {profile.sourceKind === "stratagem" && exposure && (
                <Chip
                  color="primary"
                  label={`Target: ${exposure.payloadHits} of ${profile.delivery.totalPayloads} · ${exposure.confidence}`}
                />
              )}
              {profile.delivery.activationDelaySeconds !== undefined && (
                <Chip
                  label={`${formatNumber(profile.delivery.activationDelaySeconds)}s call-in`}
                />
              )}
              {profile.delivery.activeDurationSeconds !== undefined && (
                <Chip
                  label={`${formatNumber(profile.delivery.activeDurationSeconds)}s active`}
                />
              )}
              {profile.delivery.cooldownSeconds !== undefined && (
                <Chip
                  label={`${formatNumber(profile.delivery.cooldownSeconds)}s cooldown`}
                />
              )}
              {profile.delivery.rearmSeconds !== undefined && (
                <Chip
                  label={`${formatNumber(profile.delivery.rearmSeconds)}s rearm`}
                />
              )}
              <Chip label={`AP ${component?.armorPenetration ?? "—"}`} />
              {!usesBoundedExposure(profile) && (
                <>
                  <Chip
                    label={`${formatNumber(profile.roundsPerMinute)} rpm`}
                  />
                  <Chip
                    label={
                      profile.infiniteCapacity
                        ? "Infinite cycle"
                        : profile.firingDurationSeconds === undefined
                          ? `${formatNumber(profile.capacity)} ${profile.resource.unit}s`
                          : `${formatNumber(profile.firingDurationSeconds)}s ${profile.kind === "spray" ? "fuel cycle" : "to overheat"}`
                    }
                  />
                  <Chip
                    label={
                      profile.reload?.emptySeconds !== undefined
                        ? `${formatNumber(profile.reload.emptySeconds)}s reload`
                        : profile.reload?.firstRoundSeconds !== undefined
                          ? `${formatNumber(profile.reload.firstRoundSeconds)}s first round`
                          : profile.reload?.perRoundSeconds !== undefined
                            ? `${formatNumber(profile.reload.perRoundSeconds)}s per round`
                            : profile.sourceKind === "stratagem"
                              ? "No in-field reload"
                              : "Reload unknown"
                    }
                  />
                  <Chip
                    label={
                      profile.trigger.ammoPerTrigger === "remaining"
                        ? "Consumes remaining resource / trigger"
                        : `${profile.trigger.ammoPerTrigger} ${profile.resource.unit}${profile.trigger.ammoPerTrigger === 1 ? "" : "s"} / trigger`
                    }
                  />
                  <Chip
                    label={`${profile.trigger.ammoPerTrigger === "remaining" ? "Up to " : ""}${configuredProjectilesPerTrigger} projectile${configuredProjectilesPerTrigger === 1 ? "" : "s"} / trigger`}
                  />
                  <Chip
                    label={
                      triggerWindowSeconds > 0
                        ? `${formatNumber(triggerWindowSeconds, "s")} trigger window`
                        : "Simultaneous trigger events"
                    }
                  />
                </>
              )}
            </Stack>
            {profile.sourceKind === "stratagem" &&
              usesBoundedExposure(profile) &&
              perPayloadCalculation &&
              exposedCalculation && (
                <TableContainer sx={{ mb: 2 }}>
                  <Table size="small" aria-label="Stratagem payload output">
                    <TableHead>
                      <TableRow>
                        <TableCell>Damage basis</TableCell>
                        <TableCell align="right">Per payload</TableCell>
                        <TableCell align="right">Selected target</TableCell>
                        <TableCell align="right">Total area output</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Standard</TableCell>
                        <TableCell align="right">
                          {formatNumber(
                            perPayloadCalculation.damagePerTrigger.standard,
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(
                            exposedCalculation.damagePerTrigger.standard,
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(
                            perPayloadCalculation.damagePerTrigger.standard *
                              profile.delivery.totalPayloads,
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>100% durable</TableCell>
                        <TableCell align="right">
                          {formatNumber(
                            perPayloadCalculation.damagePerTrigger.durable,
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(
                            exposedCalculation.damagePerTrigger.durable,
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(
                            perPayloadCalculation.damagePerTrigger.durable *
                              profile.delivery.totalPayloads,
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            {profile.sourceKind === "stratagem" &&
              usesBoundedExposure(profile) &&
              perPayloadCalculation && (
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  gap={0.75}
                  sx={{ mb: 2 }}
                >
                  {profile.delivery.activeDurationSeconds !== undefined && (
                    <Chip
                      label={`Active window: ${formatNumber(profile.delivery.activeDurationSeconds, "s")} · ${formatNumber((perPayloadCalculation.damagePerTrigger.standard * profile.delivery.totalPayloads) / profile.delivery.activeDurationSeconds + activeStatusDps)} standard DPS`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {profile.delivery.cooldownSeconds !== undefined && (
                    <Chip
                      label={`Cooldown amortized raw payload: ${formatNumber((perPayloadCalculation.damagePerTrigger.standard * profile.delivery.totalPayloads) / profile.delivery.cooldownSeconds)} standard/s`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {profile.delivery.rearmSeconds !== undefined && (
                    <Chip
                      label={`Rearm stock-cycle raw payload: ${formatNumber(
                        (perPayloadCalculation.damagePerTrigger.standard *
                          profile.delivery.totalPayloads *
                          (typeof profile.delivery.uses === "number"
                            ? profile.delivery.uses
                            : 1)) /
                          (profile.delivery.rearmSeconds +
                            Math.max(
                              0,
                              (typeof profile.delivery.uses === "number"
                                ? profile.delivery.uses
                                : 1) - 1,
                            ) *
                              (profile.delivery.cooldownSeconds ?? 0)),
                      )} standard/s`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {profile.delivery.activeDurationSeconds === undefined && (
                    <Chip
                      label="Active-window DPS unsupported: payload timing incomplete"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
              )}
            {(profile.components.length > 1 ||
              profile.components.some(
                ({ packetsPerProjectile }) => packetsPerProjectile > 1,
              )) && (
              <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2 }}>
                {profile.components.map((damageComponent) => (
                  <Chip
                    key={damageComponent.id}
                    label={`${damageComponent.kind}: ${formatNumber(damageComponent.standardDamage)} ${damageComponent.damageType} / packet × ${damageComponent.packetsPerProjectile} = ${formatNumber(damageComponent.standardDamage * damageComponent.packetsPerProjectile)} / projectile, AP ${damageComponent.armorPenetration}`}
                    size="small"
                    sx={{ maxWidth: "100%" }}
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}
            {bestChargeTrigger && (
              <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2 }}>
                <Chip
                  label={`Best per trigger: ${bestChargeTrigger.profile.label} (${formatNumber(bestChargeTrigger.calculation.damagePerTrigger.standard)})`}
                  size="small"
                  sx={{ maxWidth: "100%" }}
                  variant="outlined"
                />
                {bestChargeSustained && (
                  <Chip
                    label={`Best sustained: ${bestChargeSustained.profile.label} (${formatNumber(bestChargeSustained.calculation.sustainedDps?.standard)} DPS)`}
                    size="small"
                    sx={{ maxWidth: "100%" }}
                    variant="outlined"
                  />
                )}
              </Stack>
            )}
            {!usesBoundedExposure(profile) && (
              <TableContainer>
                <Table size="small" aria-label="Weapon damage output">
                  <TableHead>
                    <TableRow>
                      <TableCell>Damage basis</TableCell>
                      <TableCell align="right">Per trigger</TableCell>
                      <TableCell align="right">Burst DPS</TableCell>
                      <TableCell align="right">Magazine</TableCell>
                      <TableCell align="right">Sustained DPS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Standard</TableCell>
                      <TableCell align="right">
                        {formatNumber(calculation.damagePerTrigger.standard)}
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(calculation.burstDps.standard)}
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(calculation.magazineDamage.standard)}
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(calculation.sustainedDps?.standard)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>100% durable</TableCell>
                      <TableCell align="right">
                        {formatNumber(calculation.damagePerTrigger.durable)}
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(calculation.burstDps.durable)}
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(calculation.magazineDamage.durable)}
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(calculation.sustainedDps?.durable)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {calculation.statuses.length > 0 && (
              <>
                <Typography sx={{ mt: 2 }} variant="subtitle2">
                  Status damage while active
                </Typography>
                <TableContainer>
                  <Table size="small" aria-label="Weapon status damage output">
                    <TableHead>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">
                          Strength / projectile
                        </TableCell>
                        <TableCell align="right">Status DPS</TableCell>
                        <TableCell align="right">Full duration</TableCell>
                        <TableCell align="right">Combined active DPS</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {calculation.statuses.map((status) => (
                        <TableRow key={status.id}>
                          <TableCell>{status.label}</TableCell>
                          <TableCell align="right">
                            {formatNumber(status.strengthPerProjectile)}
                          </TableCell>
                          <TableCell align="right">
                            {formatNumber(status.damagePerSecond.standard)}
                          </TableCell>
                          <TableCell align="right">
                            {formatNumber(status.fullDurationDamage.standard)} /{" "}
                            {formatNumber(status.durationSeconds)}s
                          </TableCell>
                          <TableCell align="right">
                            {formatNumber(
                              calculation.burstDps.standard +
                                status.damagePerSecond.standard,
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Alert severity="info" sx={{ mt: 1 }}>
                  Status DPS is refresh-only and begins only after the selected
                  enemy's buildup threshold is met.
                </Alert>
              </>
            )}
            {profile.effects.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 2 }}>
                {profile.effects.map((effect) => (
                  <Chip
                    key={effect.id}
                    label={`${effect.label}: strength ${formatNumber(effect.strengthPerPacket * effect.packetsPerProjectile)} / projectile · ${formatNumber(effect.durationSeconds)}s`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}
            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 2 }}>
              {calculation.timeToEmptySeconds !== null && (
                <Chip
                  label={`${profile.heatState ? "Time to maximum heat" : "Time to empty"} ${formatNumber(calculation.timeToEmptySeconds, "s")}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {calculation.cycleSeconds !== null && (
                <Chip
                  label={`Cycle ${formatNumber(calculation.cycleSeconds, "s")}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {profile.warmupSeconds !== undefined && (
                <Chip
                  label={`Warmup ${formatNumber(profile.warmupSeconds, "s")}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {option.result.profiles.length === 1 &&
                profile.firingModes.length > 1 && (
                  <Chip
                    label={`${profile.firingModes.join(" / ")}: same maximum-rate damage timeline`}
                    size="small"
                    variant="outlined"
                  />
                )}
              {profile.heatState?.bands.map((band) => (
                <Chip
                  key={band.label}
                  label={`${band.label}: ${band.components.map((entry) => `${entry.standardDamage} damage, AP ${entry.armorPenetration}`).join(" + ")}`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>
            {calculation.warnings.map((warning) => (
              <Alert key={warning} severity="warning" sx={{ mt: 1 }}>
                {warning}
              </Alert>
            ))}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2">Assumptions</Typography>
            {profile.assumptions.map((assumption) => (
              <Typography
                color="text.secondary"
                key={assumption}
                variant="body2"
              >
                • {assumption}
              </Typography>
            ))}
            {exposure?.note && (
              <Typography color="text.secondary" variant="body2">
                • {exposure.note}
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EnemyPanel({ profile }: { profile: CombatSourceProfile | null }) {
  const mission = useSelector(selectMission);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [anatomy, setAnatomy] = useState<EnemyAnatomy | null>(null);
  const [part, setPart] = useState<EnemyAnatomyPart | null>(null);
  const [difficulty, setDifficulty] = useState(mission.difficulty + 1);
  const [hitRate, setHitRate] = useState(100);
  const [impactScenarioId, setImpactScenarioId] = useState("");
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [loadedRounds, setLoadedRounds] = useState(
    profile?.resource.capacity ?? 1,
  );
  useEffect(() => {
    setLoadedRounds(profile?.resource.capacity ?? 1);
    setDistanceMeters(0);
    setImpactScenarioId("");
  }, [profile?.id, profile?.resource.capacity]);
  const difficultyRanges = enemy ? enemyDifficultyRanges(enemy) : [];
  const selectedDifficultyRange = difficultyRanges.find(
    ({ minimum, maximum }) => difficulty >= minimum && difficulty <= maximum,
  );
  const targetResult =
    enemy && anatomy && part
      ? normalizeEnemyTarget(enemy, anatomy, part, difficulty)
      : null;
  const impactScenarios = profile?.components.some(
    ({ kind }) => kind === "explosion",
  )
    ? (targetResult?.target?.explosionScenarios ?? []).filter(
        (scenario) =>
          !scenario.directHitPartId ||
          scenario.directHitPartId === targetResult?.target?.aimedPartId,
      )
    : [];
  const selectedImpactScenarioId = impactScenarios.some(
    ({ id }) => id === impactScenarioId,
  )
    ? impactScenarioId
    : "";
  const minimumArmingDistance =
    profile?.components.reduce<number | null>((minimum, component) => {
      if (component.minimumArmingDistanceMeters === undefined) return minimum;
      return minimum === null
        ? component.minimumArmingDistanceMeters
        : Math.min(minimum, component.minimumArmingDistanceMeters);
    }, null) ?? null;
  const simulationOptions = {
    ...(selectedImpactScenarioId
      ? { impactScenarioId: selectedImpactScenarioId }
      : {}),
    ...(minimumArmingDistance === null ? {} : { distanceMeters }),
    ...(profile?.trigger.ammoPerTrigger === "remaining"
      ? {
          startingAmmunition: Math.min(
            profile.resource.capacity,
            Math.max(1, loadedRounds),
          ),
        }
      : {}),
  };
  const ttk =
    profile && targetResult?.target
      ? simulateTargetTtk(profile, targetResult.target, simulationOptions)
      : null;
  const allowsHitRate = profile && !usesBoundedExposure(profile);
  const practicalTtk =
    hitRate < 100 && allowsHitRate && profile && targetResult?.target
      ? simulateTargetTtk(profile, targetResult.target, {
          ...simulationOptions,
          hitRate: hitRate / 100,
        })
      : null;

  function chooseEnemy(value: Enemy | null) {
    const nextAnatomy = value?.anatomy[0] ?? null;
    setEnemy(value);
    setAnatomy(nextAnatomy);
    setPart(
      nextAnatomy?.parts.find((candidate) => candidate.name === "Main") ??
        nextAnatomy?.parts[0] ??
        null,
    );
    setImpactScenarioId("");
  }

  function chooseAnatomy(name: string) {
    const nextAnatomy =
      enemy?.anatomy.find((candidate) => candidate.name === name) ?? null;
    setAnatomy(nextAnatomy);
    setPart(
      nextAnatomy?.parts.find((candidate) => candidate.name === "Main") ??
        nextAnatomy?.parts[0] ??
        null,
    );
    setImpactScenarioId("");
  }

  return (
    <Card variant="outlined" sx={{ minWidth: 0 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Enemy target
        </Typography>
        <Autocomplete
          getOptionLabel={(option) => option.displayName}
          groupBy={(option) => option.faction}
          isOptionEqualToValue={(candidate, value) =>
            candidate.wikiSlug === value.wikiSlug
          }
          onChange={(_event, value) => chooseEnemy(value)}
          options={ENEMIES}
          renderInput={(params) => (
            <TextField {...params} label="Enemy (optional)" />
          )}
          value={enemy}
        />
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
            mt: 2,
          }}
        >
          <FormControl disabled={!enemy} fullWidth>
            <InputLabel id="damage-sim-anatomy-label">Anatomy</InputLabel>
            <Select
              label="Anatomy"
              labelId="damage-sim-anatomy-label"
              onChange={(event) => chooseAnatomy(event.target.value)}
              value={anatomy?.name ?? ""}
            >
              {(enemy?.anatomy ?? []).map((candidate) => (
                <MenuItem key={candidate.name} value={candidate.name}>
                  {candidate.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl disabled={!anatomy} fullWidth>
            <InputLabel id="damage-sim-part-label">Body part</InputLabel>
            <Select
              label="Body part"
              labelId="damage-sim-part-label"
              onChange={(event) => {
                setPart(
                  anatomy?.parts.find(
                    (candidate) => candidate.name === event.target.value,
                  ) ?? null,
                );
                setImpactScenarioId("");
              }}
              value={part?.name ?? ""}
            >
              {(anatomy?.parts ?? []).map((candidate, index) => (
                <MenuItem
                  key={`${candidate.name}-${index}`}
                  value={candidate.name}
                >
                  {candidate.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {difficultyRanges.length > 1 && (
            <FormControl fullWidth>
              <InputLabel id="damage-sim-difficulty-label">
                Difficulty
              </InputLabel>
              <Select
                label="Difficulty"
                labelId="damage-sim-difficulty-label"
                onChange={(event) => setDifficulty(Number(event.target.value))}
                value={String(
                  selectedDifficultyRange?.minimum ??
                    difficultyRanges[0]?.minimum ??
                    difficulty,
                )}
              >
                {difficultyRanges.map(({ minimum, maximum }) => (
                  <MenuItem key={minimum} value={String(minimum)}>
                    {minimum === maximum ? minimum : `${minimum}-${maximum}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <ImpactScenarioSelector
            onChange={setImpactScenarioId}
            scenarios={impactScenarios}
            value={selectedImpactScenarioId}
          />
          {minimumArmingDistance !== null && (
            <TextField
              inputProps={{ min: 0, step: 0.1 }}
              label="Engagement distance (m)"
              onChange={(event) =>
                setDistanceMeters(Math.max(0, Number(event.target.value)))
              }
              type="number"
              value={distanceMeters}
            />
          )}
          {profile?.trigger.ammoPerTrigger === "remaining" && (
            <TextField
              inputProps={{ min: 1, max: profile.resource.capacity, step: 1 }}
              label="Rounds currently loaded"
              onChange={(event) =>
                setLoadedRounds(
                  Math.min(
                    profile.resource.capacity,
                    Math.max(1, Math.floor(Number(event.target.value))),
                  ),
                )
              }
              type="number"
              value={Math.min(
                profile.resource.capacity,
                Math.max(1, loadedRounds),
              )}
            />
          )}
        </Box>

        {enemy && (
          <Box sx={{ alignItems: "center", display: "flex", gap: 2, my: 2 }}>
            <Box
              alt=""
              component="img"
              src={`${import.meta.env.BASE_URL}images/${enemy.imageUrl}`}
              sx={{ height: 72, objectFit: "contain", width: 96 }}
            />
            <Box>
              <Typography fontWeight={700}>{enemy.displayName}</Typography>
              <Link
                href={`https://helldivers.wiki.gg/wiki/${enemy.wikiSlug}`}
                rel="noreferrer"
                target="_blank"
                variant="body2"
              >
                View source on Helldivers Wiki
              </Link>
            </Box>
          </Box>
        )}

        {part && (
          <>
            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2 }}>
              <Chip label={`AV ${effectiveArmor(part, difficulty)}`} />
              <Chip
                label={`Health ${effectiveEnemyHealth(part, difficulty) ?? (part.health || "—")}`}
              />
              <Chip label={`Durability ${part.durability || "—"}`} />
              {part.percentToMain !== undefined && (
                <Chip
                  label={`${formatNumber(part.percentToMain * 100)}% to Main`}
                />
              )}
              {part.damageToMainCapped !== undefined && (
                <Chip
                  label={
                    part.damageToMainCapped
                      ? "Overflow capped"
                      : "Overkill transfers"
                  }
                />
              )}
              {part.fatal !== undefined && (
                <Chip
                  color={part.fatal ? "error" : "default"}
                  label={part.fatal ? "Fatal" : "Non-fatal"}
                />
              )}
              {part.explosionResistance !== undefined && (
                <Chip
                  label={`${formatNumber(part.explosionResistance * 100)}% ExDR`}
                />
              )}
              {part.demolitionForce !== undefined && (
                <Chip label={`DF ${part.demolitionForce}`} />
              )}
            </Stack>
            {part.bleedDescription && part.bleedDescription !== "None" && (
              <Alert severity="info" sx={{ mb: 1 }}>
                Constitution: {part.bleedDescription}
              </Alert>
            )}
            {allowsHitRate && (
              <Box sx={{ px: 1, py: 0.5 }}>
                <Typography id="damage-sim-hit-rate" variant="subtitle2">
                  Practical hit rate: {hitRate}%
                </Typography>
                <Slider
                  aria-labelledby="damage-sim-hit-rate"
                  marks={[
                    { value: 25, label: "25%" },
                    { value: 50, label: "50%" },
                    { value: 75, label: "75%" },
                    { value: 100, label: "100%" },
                  ]}
                  max={100}
                  min={25}
                  onChange={(_event, value) => setHitRate(value as number)}
                  step={5}
                  value={hitRate}
                />
              </Box>
            )}
            {targetResult && targetResult.unsupportedReasons.length > 0 && (
              <Alert severity="warning">
                <Typography fontWeight={700}>
                  This target cannot be simulated yet
                </Typography>
                {targetResult.unsupportedReasons.map((reason) => (
                  <Typography key={reason} variant="body2">
                    {reason}
                  </Typography>
                ))}
              </Alert>
            )}
            {!profile && (
              <Alert severity="info">
                Choose a supported combat source to calculate target TTK.
              </Alert>
            )}
            {ttk && (
              <>
                <Alert
                  severity={
                    ttk.status === "killed"
                      ? "success"
                      : ttk.status === "no-damage"
                        ? "error"
                        : "warning"
                  }
                >
                  <Typography fontWeight={700}>
                    {ttk.status === "killed"
                      ? `Optimal TTK ${formatNumber(ttk.timeToKillSeconds, "s")}`
                      : ttk.status === "part-destroyed"
                        ? "Part destroyed; enemy survives"
                        : ttk.status === "no-damage"
                          ? "No damage"
                          : profile?.sourceKind === "stratagem" &&
                              usesBoundedExposure(profile)
                            ? "Does not kill in one deployment"
                            : "TTK unavailable"}
                  </Typography>
                  <Typography variant="body2">
                    Profile: {profile?.label}
                  </Typography>
                  {profile?.sourceKind === "stratagem" &&
                    ttk.timeToKillSeconds !== null && (
                      <Typography variant="body2">
                        On target: {formatNumber(ttk.timeToKillSeconds, "s")}
                        {profile.delivery.activationDelaySeconds !== undefined
                          ? ` · From activation: ${formatNumber(ttk.timeToKillSeconds + profile.delivery.activationDelaySeconds, "s")}`
                          : " · From activation: unsupported"}
                      </Typography>
                    )}
                  {ttk.killCondition && (
                    <Typography variant="body2">
                      Kill condition: {ttk.killCondition.replaceAll("-", " ")}
                    </Typography>
                  )}
                </Alert>
                {practicalTtk && (
                  <Alert
                    severity={
                      practicalTtk.status === "killed" ? "info" : "warning"
                    }
                    sx={{ mt: 1 }}
                  >
                    <Typography fontWeight={700}>
                      Practical expected TTK:{" "}
                      {practicalTtk.timeToKillSeconds === null
                        ? practicalTtk.status.replace("-", " ")
                        : formatNumber(practicalTtk.timeToKillSeconds, "s")}
                    </Typography>
                    <Typography variant="body2">
                      {hitRate}% hit rate · {practicalTtk.shots} trigger pulls ·{" "}
                      {practicalTtk.reloads} reloads
                    </Typography>
                  </Alert>
                )}
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  gap={0.75}
                  sx={{ my: 1.5 }}
                >
                  <Chip
                    label={`${ttk.shots} trigger pull${ttk.shots === 1 ? "" : "s"}`}
                  />
                  <Chip
                    label={`${ttk.roundsConsumed} ${profile?.resource.unit ?? "round"}${ttk.roundsConsumed === 1 ? "" : "s"} consumed`}
                  />
                  <Chip
                    label={`${ttk.reloads} reload${ttk.reloads === 1 ? "" : "s"}`}
                  />
                  <Chip
                    label={`${ttk.damagePerTrigger.part} part damage / trigger`}
                  />
                  <Chip
                    label={`${ttk.damagePerTrigger.main} Main damage / trigger`}
                  />
                  {ttk.statusDamageToMain > 0 && (
                    <Chip
                      label={`${formatNumber(ttk.statusDamageToMain)} status damage during TTK`}
                    />
                  )}
                  {ttk.timeToDownSeconds !== null &&
                    ttk.bleedoutSeconds !== null && (
                      <Chip
                        label={`Down ${formatNumber(ttk.timeToDownSeconds, "s")}; bleedout ${formatNumber(ttk.bleedoutSeconds, "s")}`}
                      />
                    )}
                </Stack>
                <TableContainer>
                  <Table size="small" aria-label="Target damage calculation">
                    <TableHead>
                      <TableRow>
                        <TableCell>Component</TableCell>
                        <TableCell align="right">Blend</TableCell>
                        <TableCell align="right">Armor</TableCell>
                        <TableCell align="right">Per packet</TableCell>
                        <TableCell align="right">Packets</TableCell>
                        <TableCell align="right">To Main</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ttk.trace.map((entry, index) => (
                        <TableRow
                          key={`${entry.componentId}-${entry.targetPartId ?? "part"}-${entry.targetPartInstance ?? 1}-${index}`}
                        >
                          <TableCell>
                            {entry.componentId}
                            {entry.targetPartName &&
                            entry.targetPartId !==
                              targetResult?.target?.aimedPartId
                              ? ` → ${entry.targetPartName}${entry.targetPartInstance ? ` #${entry.targetPartInstance}` : ""}`
                              : ""}
                            {entry.eventOffsetSeconds !== undefined
                              ? ` @ +${formatNumber(entry.eventOffsetSeconds)}s`
                              : ""}
                          </TableCell>
                          <TableCell align="right">
                            {formatNumber(entry.blendedDamage)}
                          </TableCell>
                          <TableCell align="right">
                            {formatNumber(entry.armorMultiplier * 100, "%")}
                          </TableCell>
                          <TableCell align="right">
                            {entry.damagePerPacket}
                          </TableCell>
                          <TableCell align="right">{entry.packets}</TableCell>
                          <TableCell align="right">
                            {entry.mainDamage}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {ttk.warnings.map((warning) => (
                  <Alert key={warning} severity="warning" sx={{ mt: 1 }}>
                    {warning}
                  </Alert>
                ))}
              </>
            )}
          </>
        )}
        {!enemy && (
          <Typography color="text.secondary">
            Choose an enemy to inspect the target that will be used by the
            body-part TTK model.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function DamageSimulator() {
  const [mode, setMode] = useState<"browse" | "planner">("browse");
  const [weapon, setWeapon] = useState(DEFAULT_WEAPON);
  const [profileIndex, setProfileIndex] = useState(0);
  const [exposureIndex, setExposureIndex] = useState(0);
  const supported = COMBAT_SOURCES.filter(
    ({ result }) => result.profiles.length > 0,
  ).length;
  if (!weapon)
    return (
      <Alert severity="error">
        No combat sources are available to simulate.
      </Alert>
    );
  const profile =
    weapon.result.profiles[profileIndex] ?? weapon.result.profiles[0] ?? null;
  const exposure =
    profile?.delivery.exposureScenarios[exposureIndex] ??
    profile?.delivery.exposureScenarios[0];
  const targetProfile =
    profile?.sourceKind === "stratagem" && !exposure
      ? null
      : profile && exposure && usesBoundedExposure(profile)
        ? profileForExposure(profile, exposure)
        : profile;

  function chooseWeapon(option: CombatSourceOption) {
    setWeapon(option);
    setProfileIndex(0);
    setExposureIndex(0);
  }

  function planSource(option: CombatSourceOption, nextProfileIndex: number) {
    setWeapon(option);
    setProfileIndex(nextProfileIndex);
    setExposureIndex(0);
    setMode("planner");
  }

  return (
    <Box sx={{ minWidth: 0, width: "100%" }}>
      <SectionHeading
        actions={<BrowsePlannerToggle onChange={setMode} value={mode} />}
        meta={`${supported} / ${COMBAT_SOURCES.length} supported`}
        subtitle="Compare the tools of Managed Democracy, then test each one against the enemies of Super Earth."
        title="Damage Simulator"
        sx={{ mb: 2 }}
      />
      {mode === "browse" ? (
        <DamageSimulatorBrowse onPlan={planSource} sources={COMBAT_SOURCES} />
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              lg: "minmax(0, 1fr) minmax(0, 1fr)",
            },
          }}
        >
          <WeaponPanel
            onChange={chooseWeapon}
            onProfileChange={(index) => {
              setProfileIndex(index);
              setExposureIndex(0);
            }}
            exposureIndex={exposureIndex}
            onExposureChange={setExposureIndex}
            option={weapon}
            profileIndex={profileIndex}
          />
          <EnemyPanel profile={targetProfile} />
        </Box>
      )}
    </Box>
  );
}
