import { Button, Dialog, DialogTitle, DialogContent, Grid, Divider, styled } from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import { setMissionState } from "../slices/missionSlice";
import { setCreditsState } from "../slices/creditsSlice";
import { setEquipmentState } from "../slices/equipmentSlice";
import { setPreferencesState } from "../slices/preferencesSlice";
import { setPurchasedState } from "../slices/purchasedSlice";
import { setShopState } from "../slices/shopSlice";

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export default function ApplicationState({ open, setOpen }) {
  const dispatch = useDispatch();
  const missionState = useSelector((state) => state.mission);
  const fullState = useSelector((state) => state);

  const handleDone = () => {
    setOpen(false);
  };

  const handleExportMissionToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(missionState, null, 2));
    } catch (err) {
      alert(`Failed to copy mission state: ${err}`);
    }
  };

  const handleImportMissionFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      dispatch(setMissionState(parsed));
    } catch (err) {
      alert(`Failed to import mission state: ${err}`);
    }
  };

  const handleExportAllToFile = () => {
    const blob = new Blob([JSON.stringify(fullState, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "app_state.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAllFromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedState = JSON.parse(e.target.result);
        if (importedState.mission) dispatch(setMissionState(importedState.mission));
        if (importedState.credits) dispatch(setCreditsState(importedState.credits));
        if (importedState.equipment) dispatch(setEquipmentState(importedState.equipment));
        if (importedState.preferences) dispatch(setPreferencesState(importedState.preferences));
        if (importedState.purchased) dispatch(setPurchasedState(importedState.purchased));
        if (importedState.shop) dispatch(setShopState(importedState.shop));
      } catch (err) {
        alert(`Failed to import state: ${err}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onClose={handleDone}>
      <DialogTitle>Application State</DialogTitle>
      <DialogContent>
        <Grid container direction="column" spacing={2}>
          <Button onClick={handleExportMissionToClipboard} variant="contained" color="primary">
            Export Mission to Clipboard
          </Button>
          <Button onClick={handleImportMissionFromClipboard} variant="outlined" color="primary">
            Import Mission from Clipboard
          </Button>
          <Button onClick={handleExportAllToFile} variant="contained" color="secondary">
            Export All to File
          </Button>
          <Button
            component="label"
            variant="outlined"
            color="secondary"
          >
            Import All from File
            <VisuallyHiddenInput
              type="file"
              accept=".json"
              onChange={handleImportAllFromFile}
            />
          </Button>
          <Divider />
          <Button onClick={handleDone}>Done</Button>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
