import { Dialog, DialogContent, DialogTitle, Grid, List, ListItem, ListItemText, Chip, Typography, DialogActions, Button } from "@mui/material";
import { ACHIEVEMENTS } from "../constants/achievements";
import { useSelector } from "react-redux";
import { selectAchievements } from "../slices/achievementsSlice";

export default function AchievementsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { unlocked } = useSelector(selectAchievements);

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>Achievements</DialogTitle>
    <DialogContent>
      <Grid container direction="column" spacing={1}>
        <Typography color="text.secondary">
          Unlock achievements by completing themed missions. Progress persists until you use Reset State.
        </Typography>
        <List sx={{ p: 0 }}>
          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = unlocked.includes(achievement.id);

            return <ListItem key={achievement.id} disablePadding sx={{ py: 1 }}>
              <ListItemText
                primary={achievement.displayName}
                secondary={achievement.description}
              />
              <Chip
                color={isUnlocked ? "success" : "default"}
                label={isUnlocked ? "Unlocked" : "Locked"}
                variant={isUnlocked ? "filled" : "outlined"}
              />
            </ListItem>;
          })}
        </List>
      </Grid>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="primary">
        Close
      </Button>
    </DialogActions>
  </Dialog>;
}
