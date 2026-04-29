import { useState } from "react";
import { Button, Tooltip } from "@mui/material";
import SettingsDialog from "./settingsDialog";
import { useSelector } from "react-redux";
import { selectMission } from "../../slices/missionSlice";
import { selectMultiplayer } from "../../slices/multiplayerSlice";
import { Settings as SettingsIcon, Link as LinkIcon } from "@mui/icons-material";

export default function Settings() {
  const [open, setOpen] = useState(false);

  const mission = useSelector(selectMission);
  const multiplayer = useSelector(selectMultiplayer);
  const { prng } = mission;
  const displayCode = multiplayer.lobbyCode ?? String(prng).padStart(5, '0');
  const showConnectedSpinner = multiplayer.connectionStatus === "connected" && Boolean(multiplayer.lobbyState);

  function handleOpen() {
    return setOpen(true);
  }

  return (
    <>
      <Tooltip title="Preferences and Save Management">
        <Button
          sx={{ width: '100px' }}
          variant="outlined"
          onClick={handleOpen}
            startIcon={showConnectedSpinner
            ? <LinkIcon />
            : <SettingsIcon />}
        >
          {displayCode}
        </Button>
      </Tooltip>
      <SettingsDialog open={open} setOpen={setOpen} />
    </>
  );
}
