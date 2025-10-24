import { Button, Dialog, DialogTitle, DialogContent, Grid, Divider, ToggleButtonGroup, ToggleButton, FormLabel, DialogActions } from "@mui/material";
import Preferences from "./preferences";
import ResetAppState from "./reset";
import ImportExport from "./importExport";

export default function Settings({ open, setOpen }) {
  function handleClose() {
    setOpen(false);
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Grid container direction="column" spacing={2}>
          <Divider />
          <ImportExport />
          <Divider />
          <Preferences />
          <Divider />
          <Done />
        </Grid>
      </DialogContent>
    </Dialog>
  );

  function Done() {
    return <DialogActions>
      <ResetAppState onClick={handleClose} />
      <Button onClick={handleClose}>Close</Button>
    </DialogActions>;
  }
}
