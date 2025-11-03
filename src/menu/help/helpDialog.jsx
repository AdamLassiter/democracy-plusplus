import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

export default function HelpDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Help</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" gutterBottom>
          Democracy++ is a metagame built for Helldivers who crave <u>order</u>, <u>structure</u>, and <u>painful fairness</u>.
          It introduces a <u>quest, challenge & shop</u> system to the Helldivers 2 experience, letting players earn, spend, and suffer in glorious liberation.
        </Typography>
        <Typography variant="body1" gutterBottom>
          <u>Lock in</u> your chosen faction an mission type, but pay attention to the <u>Maximum Base Reward</u>.
          Harder objectives will reward handsomely.
        </Typography>
        <Typography variant="body1" gutterBottom>
          Visit the <u>Shop</u> to see what is on sale and purchase equipment for your next loadout.
          Maybe you will get lucky and find an S-tier stratagem for a significant discount.
        </Typography>
        <Typography variant="body1" gutterBottom>
          Tune your equipment to not just the faction and objective, but the Discretionary Assignments and Rules of Engagement.
          <u>Discretionary Assignments</u> will reward you giving your all to further the supremacy of Super Earth.
          Those who break the <u>Rules of Engagement</u> will be branded no better than traitors, and any mission rewards will be confiscated.
        </Typography>
        <Typography variant="body1" gutterBottom>
          Once your mission is complete, submit a <u>Debrief</u> to your Democracy Officer.
          Honesty is pivotal, Helldiver - there are Truth Enforcers monitoring...
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
