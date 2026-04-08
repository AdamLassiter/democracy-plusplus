import { Button, Dialog, DialogTitle, DialogContent, DialogActions, List } from "@mui/material";
import Preferences from "./preferences";
import ResetAppState from "./reset";
import ImportExport from "./importExport";

export default function SettingsDialog({ open, setOpen }) {
  function handleClose() {
    setOpen(false);
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
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
