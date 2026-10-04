import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Link,
} from "@mui/material";
import { StratagemCodeDisplay } from "../../utils/stratagemCode";
import { useSelector } from "react-redux";
import { selectChallengeDefinition } from "../../slices/challengesSlice";
import CloseableDialogTitle from "../../utils/closeableDialogTitle";

export default function HelpDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const challenge = useSelector(selectChallengeDefinition);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <CloseableDialogTitle onClose={onClose}>Help</CloseableDialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" gutterBottom>
          Democracy++ is a metagame built for Helldivers who crave <u>order</u>,{" "}
          <u>structure</u>, and <u>painful fairness</u>. It introduces
          structured mission and loadout challenges to the Helldivers 2
          experience.
        </Typography>
        <Typography variant="body1" gutterBottom>
          Choose a challenge mode, faction, difficulty, and objective, then{" "}
          <u>Lock In</u> to prepare the mission loadout.
        </Typography>
        <Typography variant="body1" gutterBottom>
          <u>{challenge.name}:</u> {challenge.help}
        </Typography>
        <Typography variant="body1" gutterBottom>
          Which warbonds may appear in random and knockout pools. Basic Training
          is always available.
        </Typography>
        <Typography variant="body1" gutterBottom>
          Once your mission is complete, report its stars to your Democracy
          Officer. Budget mode also reports assignments, restrictions, and
          rewards; other modes advance their personal challenge run.
        </Typography>
        <Typography variant="body1" gutterBottom sx={{ padding: 4 }}>
          Inspired by{" "}
          <Link
            href="https://helldivers2challenges.com/"
            target="_blank"
            rel="noopener"
          >
            Helldivers 2 Challenges
          </Link>
          . Open source on{" "}
          <Link
            href="https://github.com/AdamLassiter/democracy-plusplus"
            target="_blank"
            rel="noopener"
          >
            GitHub
          </Link>
          .
        </Typography>
        <StratagemCodeDisplay
          code={["Up", "Up", "Down", "Down", "Left", "Right", "Left", "Right"]}
          iconSize={12}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
