import { useState } from "react";
import {
  Badge,
  Button,
  Tooltip,
} from "@mui/material";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import { useSelector } from "react-redux";
import { selectChallenges } from "../../slices/challengesSlice";
import { selectMission } from "../../slices/missionSlice";
import WarbondsDialog from "./warbondsDialog";

export default function Warbonds() {
  const { ownedWarbondCodes } = useSelector(selectChallenges);
  const mission = useSelector(selectMission);
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
  }

  return (
    <>
      <Tooltip title="Choose the content you own for every challenge mode">
        <Badge
          badgeContent={ownedWarbondCodes.length}
          color="secondary"
          overlap="circular"
        >
          <Button
            disabled={mission.state !== "brief"}
            variant="outlined"
            color="secondary"
            startIcon={<MilitaryTechIcon />}
            onClick={handleOpen}
            aria-label="Warbonds"
            sx={{
              minWidth: { xs: 44, sm: 124 },
              px: { xs: 1, sm: 2 },
              "& .MuiButton-startIcon": { mr: { xs: 0, sm: 1 } },
            }}
          >
            <span className="mobile-hidden-label">Warbonds</span>
          </Button>
        </Badge>
      </Tooltip>
      <WarbondsDialog open={open} setOpen={setOpen} />
    </>
  );
}
