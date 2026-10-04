import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { setWarbonds } from "../../slices/shopSlice";
import { selectMission } from "../../slices/missionSlice";
import { selectTierList } from "../../slices/tierListSlice";
import { selectMultiplayer } from "../../slices/multiplayerSlice";
import { WARBONDS } from "../../constants/warbonds";
import type { Warbond } from "../../types";
import { resetShop } from "../../slices/shopSlice";
import { getEffectivePlayerCount } from "../../utils/playerCount";
import {
  selectChallenges,
  setOwnedWarbondCodes,
} from "../../slices/challengesSlice";
import CloseableDialogTitle from "../../utils/closeableDialogTitle";

export default function WarbondsDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (_open: boolean) => void;
}) {
  const dispatch = useDispatch();
  const { ownedWarbondCodes } = useSelector(selectChallenges);
  const { count, playerCount: localPlayerCount } = useSelector(selectMission);
  const { overrides } = useSelector(selectTierList);
  const multiplayer = useSelector(selectMultiplayer);
  const playerCount = getEffectivePlayerCount(
    localPlayerCount,
    multiplayer.lobbyState,
  );
  const [selected, setSelected] = useState<Warbond[]>(() =>
    WARBONDS.filter((warbond) =>
      ownedWarbondCodes.includes(warbond.warbondCode),
    ),
  );

  useEffect(() => {
    if (open) {
      setSelected(
        WARBONDS.filter((warbond) =>
          ownedWarbondCodes.includes(warbond.warbondCode),
        ),
      );
    }
  }, [open, ownedWarbondCodes]);

  function handleToggle(warbond: Warbond) {
    if (warbond.warbondCode === "none") return;
    setSelected((prev) => {
      const exists = prev.find((w) => w.warbondCode === warbond.warbondCode);
      if (exists) {
        return prev.filter((w) => w.warbondCode !== warbond.warbondCode);
      } else {
        return [...prev, warbond];
      }
    });
  }

  function handleSave() {
    dispatch(
      setOwnedWarbondCodes(selected.map((warbond) => warbond.warbondCode)),
    );
    dispatch(setWarbonds({ value: selected }));
    dispatch(
      resetShop({ missionCount: count, playerCount, tierOverrides: overrides }),
    );
    setOpen(false);
  }

  function handleCancel() {
    setSelected(
      WARBONDS.filter((warbond) =>
        ownedWarbondCodes.includes(warbond.warbondCode),
      ),
    );
    setOpen(false);
  }

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <CloseableDialogTitle onClose={handleCancel}>
        Warbonds
      </CloseableDialogTitle>
      <DialogContent dividers>
        <List>
          {WARBONDS.map((warbond) => {
            const isChecked = selected.some(
              (w) => w.warbondCode === warbond.warbondCode,
            );
            return (
              <ListItem
                key={warbond.warbondCode}
                onClick={() => handleToggle(warbond)}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={isChecked}
                    tabIndex={-1}
                    disableRipple
                    disabled={warbond.warbondCode === "none"}
                  />
                </ListItemIcon>
                <ListItemText primary={warbond.displayName} />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
