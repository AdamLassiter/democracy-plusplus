import { Button, Dialog, DialogTitle, DialogContent, Grid, Divider, ToggleButtonGroup, ToggleButton, FormLabel } from "@mui/material";
import Preferences from "./preferences";
import ResetAppState from "./reset";
import ImportExport from "./importExport";

export default function Settings({ open, setOpen }) {
  function handleDone() {
    setOpen(false);
  }

  return (
    <Dialog open={open} onClose={handleDone}>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Grid container direction="column" spacing={2}>
          <Divider />
          <ImportExport />
          <Divider />
          <Preferences />
          <Divider />
          <ResetAppState onClick={handleDone}/>
          <Done />
        </Grid>
      </DialogContent>
    </Dialog>
  );

  function Done() {
    return <Grid container direction="column" spacing={2}>
      <Button onClick={handleDone}>Done</Button>
    </Grid>;
  }
}
