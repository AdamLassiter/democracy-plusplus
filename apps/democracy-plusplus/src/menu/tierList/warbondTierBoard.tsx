import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  Chip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { Item, Tier, Warbond } from "../../types";
import ItemDisplay, { ItemIcon } from "../../utils/itemDisplay";
import { getSortedWarbondItems, TIER_ORDER } from "../../utils/tierList";
import { getWarbondSummary, WARBOND_BEST_CATEGORIES } from "../../utils/warbondSummary";
import { TIER_ACCENTS, TIER_LABELS } from "./tierStyles";

type WarbondTierBoardProps = {
  warbonds: Warbond[];
  items: Item[];
  onOpenItem: (_item: Item) => void;
};

function WarbondAccordion({
  warbond,
  items,
  expanded,
  onExpanded,
  onOpenItem,
}: {
  warbond: Warbond;
  items: Item[];
  expanded: boolean;
  onExpanded: (_expanded: boolean) => void;
  onOpenItem: (_item: Item) => void;
}) {
  const warbondItems = useMemo(
    () => getSortedWarbondItems(items, warbond.warbondCode),
    [items, warbond.warbondCode],
  );
  const summary = useMemo(
    () => getWarbondSummary(items, warbond.warbondCode),
    [items, warbond.warbondCode],
  );
  const panelId = `warbond-${warbond.warbondCode}`;

  return <Accordion
    disableGutters
    expanded={expanded}
    onChange={(_event, nextExpanded) => onExpanded(nextExpanded)}
    sx={{ "&:before": { display: "none" } }}
  >
    <AccordionSummary
      aria-controls={`${panelId}-content`}
      expandIcon={<ExpandMoreIcon />}
      id={`${panelId}-header`}
      sx={{ minWidth: 0 }}
    >
      <Box sx={{ alignItems: "center", display: "flex", gap: 2, minWidth: 0, width: "100%" }}>
        <ItemIcon
          item={warbond}
          bgcolor="black"
          flexShrink={0}
          height={{ xs: 49, sm: 80 }}
          objectFit="contain"
          width={{ xs: 96, sm: 160 }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700}>{warbond.displayName}</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
            <Chip
              label={`${summary.itemCount} ${summary.itemCount === 1 ? "item" : "items"}`}
              size="small"
              variant="outlined"
            />
            {WARBOND_BEST_CATEGORIES.flatMap(({ category, label }) => {
              const tier = summary.bestTiers[category];
              return tier ? [<Chip
                key={category}
                label={`${label} ${TIER_LABELS[tier]}`}
                size="small"
                variant="outlined"
                sx={{ borderColor: TIER_ACCENTS[tier] }}
              />] : [];
            })}
            {summary.armorPenetrationLabels.map((label) => <Chip
              key={`armor-${label}`}
              label={`AP ${label}`}
              size="small"
              variant="outlined"
            />)}
            {summary.damageTypes.map((damageType) => <Chip
              key={`damage-${damageType}`}
              label={damageType}
              size="small"
              variant="outlined"
            />)}
          </Box>
        </Box>
      </Box>
    </AccordionSummary>
    <AccordionDetails id={`${panelId}-content`}>
      {warbondItems.length > 0
        ? <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {warbondItems.map((item) => <ItemDisplay key={item.displayName} item={item} onClick={onOpenItem} />)}
        </Box>
        : <Typography color="text.secondary">No Armory items are assigned to this warbond.</Typography>}
    </AccordionDetails>
  </Accordion>;
}

export default function WarbondTierBoard({ warbonds, items, onOpenItem }: WarbondTierBoardProps) {
  const [expandedWarbonds, setExpandedWarbonds] = useState<Set<string>>(() => new Set());
  const groupedWarbonds = Object.groupBy(warbonds, (warbond) => warbond.tier) as Partial<Record<Tier, Warbond[]>>;

  function setExpanded(warbondCode: string, expanded: boolean) {
    setExpandedWarbonds((current) => {
      const next = new Set(current);
      if (expanded) {
        next.add(warbondCode);
      } else {
        next.delete(warbondCode);
      }
      return next;
    });
  }

  return <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    {TIER_ORDER.map((tier) => {
      const tierWarbonds = [...(groupedWarbonds[tier] ?? [])]
        .sort((left, right) => left.displayName.localeCompare(right.displayName));

      return <Box
        key={tier}
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: { xs: "56px minmax(0, 1fr)", sm: "88px minmax(0, 1fr)" },
          minHeight: tierWarbonds.length ? undefined : 88,
        }}
      >
        <Card
          variant="outlined"
          sx={{
            alignItems: "center",
            borderLeft: `6px solid ${TIER_ACCENTS[tier]}`,
            display: "flex",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <Typography variant="h2" sx={{ fontWeight: 700 }}>{TIER_LABELS[tier]}</Typography>
        </Card>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          {tierWarbonds.map((warbond) => <WarbondAccordion
            key={warbond.warbondCode}
            warbond={warbond}
            items={items}
            expanded={expandedWarbonds.has(warbond.warbondCode)}
            onExpanded={(expanded) => setExpanded(warbond.warbondCode, expanded)}
            onOpenItem={onOpenItem}
          />)}
        </Box>
      </Box>;
    })}
  </Box>;
}
