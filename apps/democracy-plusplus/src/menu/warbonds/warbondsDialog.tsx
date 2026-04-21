import { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { selectShop, setWarbonds } from "../../slices/shopSlice";
import { selectMission } from "../../slices/missionSlice";
import { selectTierList } from "../../slices/tierListSlice";
import { selectMultiplayer } from "../../slices/multiplayerSlice";
import { WARBONDS } from "../../constants/warbonds";
import type { Warbond } from "../../types";
import { resetShop } from "../../slices/shopSlice";
import { getEffectivePlayerCount } from "../../utils/playerCount";

export default function WarbondsDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const dispatch = useDispatch();
  const { warbonds } = useSelector(selectShop);
  const { count, playerCount: localPlayerCount } = useSelector(selectMission);
  const { overrides } = useSelector(selectTierList);
  const multiplayer = useSelector(selectMultiplayer);
  const playerCount = getEffectivePlayerCount(localPlayerCount, multiplayer.lobbyState);
  const [selected, setSelected] = useState<Warbond[]>(warbonds);

  function handleToggle(warbond: Warbond) {
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
    dispatch(setWarbonds({ value: selected }));
    dispatch(resetShop({ missionCount: count, playerCount, tierOverrides: overrides }));
    setOpen(false);
  }

  function handleCancel() {
    setSelected(warbonds);
    setOpen(false);
  }

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Select Warbonds</DialogTitle>
      <DialogContent dividers>
        <List>
          {WARBONDS.map((warbond) => {
            const isChecked = selected.some(
              (w) => w.warbondCode === warbond.warbondCode
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
