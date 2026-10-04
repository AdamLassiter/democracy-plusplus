import {
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { Tier } from "../../types";
import type { DamageProfileSummary } from "../../utils/damage/profileSummary";
import { getEffectiveTier, TIER_COLORS, TIER_ORDER } from "../../utils/tierList";

type SortKey =
  | "tier"
  | "source"
  | "profile"
  | "armorPenetration"
  | "burstStandard"
  | "burstDurable"
  | "sustainedStandard"
  | "sustainedDurable"
  | "totalStandard"
  | "totalDurable";

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function valueFor(row: DamageProfileSummary, key: SortKey, tierOverrides: Record<string, Tier>): string | number | null {
  if (key === "tier") return TIER_ORDER.indexOf(getEffectiveTier(row.item, tierOverrides));
  if (key === "source") return row.item.displayName;
  if (key === "profile") return row.profile?.label ?? "Unsupported";
  if (key === "armorPenetration") return row.armorPenetration;
  if (key === "burstStandard") return row.burstDps?.standard ?? null;
  if (key === "burstDurable") return row.burstDps?.durable ?? null;
  if (key === "sustainedStandard") return row.sustainedDps?.standard ?? null;
  if (key === "sustainedDurable") return row.sustainedDps?.durable ?? null;
  if (key === "totalStandard") return row.totalDamage?.standard ?? null;
  return row.totalDamage?.durable ?? null;
}

function compareValues(left: string | number, right: string | number) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right));
}

function NumericHeading({ label, sortKey, activeKey, direction, onSort }: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: "asc" | "desc";
  onSort: (_key: SortKey) => void;
}) {
  return <TableCell align="right" sortDirection={activeKey === sortKey ? direction : false}>
    <TableSortLabel
      active={activeKey === sortKey}
      direction={activeKey === sortKey ? direction : "desc"}
      onClick={() => onSort(sortKey)}
    >{label}</TableSortLabel>
  </TableCell>;
}

function format(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : numberFormatter.format(value);
}

export default function DamageProfileTable({ rows, showSource = true, onSelect, tierOverrides = {} }: {
  rows: DamageProfileSummary[];
  showSource?: boolean;
  onSelect?: (_row: DamageProfileSummary) => void;
  tierOverrides?: Record<string, Tier>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>(showSource ? "source" : "burstStandard");
  const [direction, setDirection] = useState<"asc" | "desc">(showSource ? "asc" : "desc");
  const sortedRows = useMemo(() => [...rows].sort((left, right) => {
    const leftValue = valueFor(left, sortKey, tierOverrides);
    const rightValue = valueFor(right, sortKey, tierOverrides);
    if (leftValue === null) return rightValue === null ? 0 : 1;
    if (rightValue === null) return -1;
    const comparison = compareValues(leftValue, rightValue);
    return direction === "asc" ? comparison : -comparison;
  }), [direction, rows, sortKey, tierOverrides]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setDirection((current) => current === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setDirection(key === "tier" || key === "source" || key === "profile" ? "asc" : "desc");
    }
  }

  if (!rows.length) return <Typography color="text.secondary">No combat sources match the current filters.</Typography>;

  return <TableContainer sx={{ maxWidth: "100%" }}>
    <Table aria-label="Damage simulation profiles" size="small" sx={{ minWidth: showSource ? 1120 : 960 }}>
      <TableHead>
        <TableRow>
          {showSource && <TableCell sortDirection={sortKey === "tier" ? direction : false} sx={{ width: 52 }}>
            <TableSortLabel active={sortKey === "tier"} direction={sortKey === "tier" ? direction : "asc"} onClick={() => handleSort("tier")}>Tier</TableSortLabel>
          </TableCell>}
          {showSource && <TableCell sortDirection={sortKey === "source" ? direction : false}>
            <TableSortLabel active={sortKey === "source"} direction={sortKey === "source" ? direction : "asc"} onClick={() => handleSort("source")}>Source</TableSortLabel>
          </TableCell>}
          <TableCell sortDirection={sortKey === "profile" ? direction : false}>
            <TableSortLabel active={sortKey === "profile"} direction={sortKey === "profile" ? direction : "asc"} onClick={() => handleSort("profile")}>Profile</TableSortLabel>
          </TableCell>
          <NumericHeading activeKey={sortKey} direction={direction} label="AP" onSort={handleSort} sortKey="armorPenetration" />
          <TableCell>Damage type</TableCell>
          <NumericHeading activeKey={sortKey} direction={direction} label="Burst DPS" onSort={handleSort} sortKey="burstStandard" />
          <NumericHeading activeKey={sortKey} direction={direction} label="Durable burst DPS" onSort={handleSort} sortKey="burstDurable" />
          <NumericHeading activeKey={sortKey} direction={direction} label="Sustained DPS" onSort={handleSort} sortKey="sustainedStandard" />
          <NumericHeading activeKey={sortKey} direction={direction} label="Durable sustained DPS" onSort={handleSort} sortKey="sustainedDurable" />
          <NumericHeading activeKey={sortKey} direction={direction} label="Total damage" onSort={handleSort} sortKey="totalStandard" />
          <NumericHeading activeKey={sortKey} direction={direction} label="Total durable damage" onSort={handleSort} sortKey="totalDurable" />
        </TableRow>
      </TableHead>
      <TableBody>{sortedRows.map((row) => <TableRow hover={Boolean(onSelect)} key={`${row.item.displayName}:${row.profile?.id ?? "unsupported"}`}>
        {showSource && (() => {
          const tier = getEffectiveTier(row.item, tierOverrides);
          return <TableCell>
            <Typography
              aria-label={`Tier ${tier.toUpperCase()}`}
              component="span"
              sx={{ color: TIER_COLORS[tier], fontWeight: 700 }}
            >
              {tier.toUpperCase()}
            </Typography>
          </TableCell>;
        })()}
        {showSource && <TableCell>
          {onSelect
            ? <Button onClick={() => onSelect(row)} sx={{ justifyContent: "flex-start", minWidth: 0, p: 0, textAlign: "left", textTransform: "none" }}>{row.item.displayName}</Button>
            : row.item.displayName}
        </TableCell>}
        <TableCell>
          <Tooltip title={row.warnings.join(" ")} disableHoverListener={!row.warnings.length}>
            <span>{row.profile?.label ?? "Unsupported"}</span>
          </Tooltip>
        </TableCell>
        <TableCell align="right">{format(row.armorPenetration)}</TableCell>
        <TableCell><Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {row.damageTypes.length
            ? row.damageTypes.map((type) => <Chip key={type} label={type} size="small" variant="outlined" />)
            : "—"}
        </Box></TableCell>
        <TableCell align="right">{format(row.burstDps?.standard)}</TableCell>
        <TableCell align="right">{format(row.burstDps?.durable)}</TableCell>
        <TableCell align="right">{format(row.sustainedDps?.standard)}</TableCell>
        <TableCell align="right">{format(row.sustainedDps?.durable)}</TableCell>
        <TableCell align="right">{format(row.totalDamage?.standard)}</TableCell>
        <TableCell align="right">{format(row.totalDamage?.durable)}</TableCell>
      </TableRow>)}</TableBody>
    </Table>
  </TableContainer>;
}
