import { Button, Dialog, DialogContent, DialogActions, List } from "@mui/material";
import type { Dispatch, SetStateAction } from "react";
import Preferences from "./preferences";
import ResetAppState from "./reset";
import ImportExport from "./importExport";
import CloseableDialogTitle from "../../utils/closeableDialogTitle";

export default function SettingsDialog({ open, setOpen }: { open: boolean; setOpen: Dispatch<SetStateAction<boolean>> }) {
  function handleClose() {
    setOpen(false);
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <CloseableDialogTitle onClose={handleClose}>Settings</CloseableDialogTitle>
      <DialogContent dividers>
        <List>
          <ImportExport />
        </List>
        <List>
          <Preferences />
        </List>
      </DialogContent>
      <Done />
    </Dialog>
  );

  function Done() {
    return <DialogActions>
      <ResetAppState onClick={handleClose} />
      <Button onClick={handleClose}>Close</Button>
    </DialogActions>;
  }
}
