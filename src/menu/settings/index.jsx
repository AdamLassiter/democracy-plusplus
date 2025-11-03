import { useState } from "react";
import { Button, Tooltip } from "@mui/material";
import SettingsDialog from "./settingsDialog";
import { useSelector } from "react-redux";
import { selectMission } from "../../slices/missionSlice";
import { Settings as SettingsIcon } from "@mui/icons-material";

export default function Settings() {
  const [open, setOpen] = useState(false);

  const mission = useSelector(selectMission);
  const { prng } = mission;

  function handleOpen() {
    return setOpen(true);
  }

  return (
    <>
      <Tooltip title="Need help?">
        <Button
          sx={{ width: '100px' }}
          variant="outlined"
          onClick={handleOpen}
        >
          <SettingsIcon />
          &nbsp;
          {prng}
        </Button>
      </Tooltip>
      <SettingsDialog open={open} setOpen={setOpen} />
    </>
  );
}
