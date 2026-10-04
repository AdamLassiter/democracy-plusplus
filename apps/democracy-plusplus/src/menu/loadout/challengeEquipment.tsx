import type { ReactNode, SyntheticEvent } from "react";
import { Box, Divider, Grid, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getItem } from "../../constants";
import { getWarbondByCode } from "../../constants/warbonds";
import { CHALLENGE_DEFINITIONS } from "../../challenges/engine";
import {
  equipChallengeItem,
  selectActiveEquipment,
  selectChallengeEligibleItems,
  selectChallenges,
  selectEffectiveChallengeMode,
  unequipChallengeItem,
} from "../../slices/challengesSlice";
import type { Item, ItemCategory } from "../../types";
import ItemDisplay, {
  MissingArmor,
  MissingBooster,
  MissingPrimary,
  MissingSecondary,
  MissingStratagem,
  MissingThrowable,
} from "../../utils/itemDisplay";
import SectionHeading from "../../utils/sectionHeading";

export default function ChallengeEquipment() {
  const dispatch = useDispatch();
  const modeId = useSelector(selectEffectiveChallengeMode);
  const challenges = useSelector(selectChallenges);
  const equipment = useSelector(selectActiveEquipment);
  const eligibleItems = useSelector(selectChallengeEligibleItems);
  const definition = CHALLENGE_DEFINITIONS[modeId];
  const [tab, setTab] = useState(0);

  const activeWarbond =
    modeId === "warbond-knockout"
      ? getWarbondByCode(challenges.warbondKnockout.activeWarbondCode ?? "")
      : null;
  const progress =
    modeId === "randomizer"
      ? `Round ${challenges.randomizer.round}`
      : modeId === "all-item-knockout"
        ? `Cycle ${challenges.allItemKnockout.cycle} · ${challenges.allItemKnockout.remainingItemIds.length}/${challenges.allItemKnockout.cycleItemIds.length} items remaining`
        : `Cycle ${challenges.warbondKnockout.cycle} · ${challenges.warbondKnockout.remainingWarbondCodes.length}/${challenges.warbondKnockout.cycleWarbondCodes.length} warbonds remaining`;

  function equip(displayName: string) {
    dispatch(equipChallengeItem({ modeId, displayName }));
  }

  function unequip(displayName: string) {
    if (definition.editableLoadout) {
      dispatch(unequipChallengeItem({ modeId, displayName }));
    }
  }

  return (
    <Grid container direction="column" spacing={2}>
      <Box>
        <Typography variant="h5">{definition.name}</Typography>
        <Typography color="text.secondary">{progress}</Typography>
        {activeWarbond && (
          <Typography color="secondary.main">
            Active warbond: {activeWarbond.displayName}
          </Typography>
        )}
      </Box>
      <EquippedChallengeItems
        equipment={equipment}
        editable={definition.editableLoadout}
        unequip={unequip}
      />
      {definition.editableLoadout && (
        <>
          <Divider />
          <AvailableChallengeItems
            items={eligibleItems}
            tab={tab}
            setTab={setTab}
            equip={equip}
          />
        </>
      )}
    </Grid>
  );
}

function EquippedChallengeItems({
  equipment,
  editable,
  unequip,
}: {
  equipment: ReturnType<typeof selectActiveEquipment>;
  editable: boolean;
  unequip: (_displayName: string) => void;
}) {
  function display(
    displayName: string | null,
    fallback: ReactNode,
    key: string,
  ) {
    return displayName ? (
      <ItemDisplay
        key={key}
        item={getItem(displayName)!}
        onClick={editable ? () => unequip(displayName) : undefined}
      />
    ) : (
      fallback
    );
  }

  return (
    <Box>
      <SectionHeading
        subtitle={
          editable
            ? "The weapons, support gear and booster prepared for this deployment."
            : "High Command has selected these tools for the next deployment."
        }
        title={editable ? "Equipment" : "Assigned Loadout"}
      />
      <Grid direction="row" container spacing={1} paddingTop={1}>
        {display(
          equipment.primary,
          <MissingPrimary key="primary-missing" />,
          "primary",
        )}
        {display(
          equipment.secondary,
          <MissingSecondary key="secondary-missing" />,
          "secondary",
        )}
        {display(
          equipment.throwable,
          <MissingThrowable key="throwable-missing" />,
          "throwable",
        )}
        {display(
          equipment.armorPassive,
          <MissingArmor key="armor-missing" />,
          "armor",
        )}
        <Divider
          orientation="vertical"
          variant="middle"
          flexItem
          sx={{ display: { xs: "none", sm: "block" } }}
        />
        {equipment.stratagems.map((stratagem: string | null, index: number) =>
          display(
            stratagem,
            <MissingStratagem key={`stratagem-${index}-missing`} />,
            `stratagem-${index}-${stratagem}`,
          ),
        )}
        {display(
          equipment.booster,
          <MissingBooster key="booster-missing" />,
          "booster",
        )}
      </Grid>
    </Box>
  );
}

function AvailableChallengeItems({
  items,
  tab,
  setTab,
  equip,
}: {
  items: Item[];
  tab: number;
  setTab: (_tab: number) => void;
  equip: (_displayName: string) => void;
}) {
  const grouped = Object.groupBy(
    items,
    (item) => item.category ?? "crate",
  ) as Partial<Record<ItemCategory, Item[]>>;
  const lists: Array<[string, Item[]]> = [
    ["Primaries", grouped.primary ?? []],
    ["Secondaries", grouped.secondary ?? []],
    ["Throwables", grouped.throwable ?? []],
    ["Armor Passives", grouped.armor ?? []],
    [
      "Stratagems",
      [
        ...(grouped.Supply ?? []),
        ...(grouped.Eagle ?? []),
        ...(grouped.Defense ?? []),
        ...(grouped.Orbital ?? []),
      ],
    ],
    ["Boosters", grouped.booster ?? []],
  ];
  const selected = lists[tab]?.[1] ?? [];

  return (
    <Box>
      <SectionHeading
        subtitle="Eligible equipment remaining under the active challenge rules."
        title="Available Equipment"
      />
      <Tabs
        value={tab}
        onChange={(_event: SyntheticEvent, value: number) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {lists.map(([label, entries]) => (
          <Tab key={label} label={`${label} (${entries.length})`} />
        ))}
      </Tabs>
      {!selected.length && (
        <Typography color="text.secondary" paddingTop={2}>
          No item from this category may be used this round.
        </Typography>
      )}
      <Grid direction="row" container spacing={1} paddingTop={1}>
        {[...selected]
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .map((item) => (
            <ItemDisplay
              key={item.displayName}
              item={item}
              onClick={() => equip(item.displayName)}
            />
          ))}
      </Grid>
    </Box>
  );
}
