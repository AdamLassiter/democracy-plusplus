import React, { useState } from "react";
import {
  Badge,
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
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import { useDispatch, useSelector } from "react-redux";
import { selectShop, setWarbonds } from "../slices/shopSlice";
import { WARBONDS } from "../constants/warbonds";

export default function WarbondsFilter() {
  const dispatch = useDispatch();
  const { warbonds } = useSelector(selectShop);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(warbonds);

  function handleToggle(warbond) {
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
    setOpen(false);
  }

  function handleCancel() {
    setSelected(warbonds);
    setOpen(false);
  }

  return (
    <>
      {/* Badge button that opens the dialog */}
      <Badge
        badgeContent={warbonds.length}
        color="secondary"
        overlap="circular"
      >
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<MilitaryTechIcon />}
          onClick={() => setOpen(true)}
        >
          Warbonds
        </Button>
      </Badge>

      {/* Dialog */}
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
                  button
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
    </>
  );
}
