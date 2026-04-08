import { useState } from "react";
import {
  Badge,
  Button,
} from "@mui/material";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import { useSelector } from "react-redux";
import { selectShop } from "../../slices/shopSlice";
import WarbondsDialog from "./warbondsDialog";

export default function Warbonds() {
  const { warbonds } = useSelector(selectShop);
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
  }

  return (
    <>
      <Badge
        badgeContent={warbonds.length}
        color="secondary"
        overlap="circular"
      >
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<MilitaryTechIcon />}
          onClick={handleOpen}
        >
          Warbonds
        </Button>
      </Badge>
      <WarbondsDialog open={open} setOpen={setOpen} />
    </>
  );
}
