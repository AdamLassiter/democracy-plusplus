import { useDispatch, useSelector } from "react-redux";
import { selectMission, setMissionState } from "../../slices/missionSlice";
import { setPreferencesState } from "../../slices/preferencesSlice";
import { setCreditsState } from "../../slices/creditsSlice";
import { setEquipmentState } from "../../slices/equipmentSlice";
import { setPurchasedState } from "../../slices/purchasedSlice";
import { setShopState } from "../../slices/shopSlice";
import styled from "@emotion/styled";
import { Button, FormLabel, Grid } from "@mui/material";

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

export default function ImportExport() {
  const dispatch = useDispatch();
  const missionState = useSelector(selectMission);
  const fullState = useSelector((state) => state);

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

  return <Grid container direction="column" spacing={2}>
    <FormLabel component="legend">Import/Export</FormLabel>
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
        onChange={handleImportAllFromFile} />
    </Button>
  </Grid>;
}
