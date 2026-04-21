import { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import HelpDialog from "./helpDialog";

export default function Help() {
  const [open, setOpen] = useState(false);

  function handleOpen() {
    return setOpen(true);
  }
  function handleClose() {
    return setOpen(false);
  }

  return (
    <>
      <Tooltip title="Need help?">
        <IconButton color="primary" onClick={handleOpen}>
          <HelpOutlineIcon />
        </IconButton>
      </Tooltip>
      <HelpDialog open={open} onClose={handleClose} />
    </>
  );
}
