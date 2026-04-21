import { Card, Chip, Divider, Grid, List, ListItem, ListItemText, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { selectMultiplayer } from "../../slices/multiplayerSlice";
import type { LobbyMember } from "../../types";

function formatLoadout(member: { loadout: { primary: string | null; secondary: string | null; throwable: string | null; armorPassive: string | null; booster: string | null; stratagems: Array<string | null> } }) {
  return [
    member.loadout.primary,
    member.loadout.secondary,
    member.loadout.throwable,
    member.loadout.armorPassive,
    member.loadout.booster,
    ...member.loadout.stratagems,
  ].filter((item): item is string => Boolean(item));
}

export default function LobbyPanel() {
  const multiplayer = useSelector(selectMultiplayer);

  if (!multiplayer.lobbyState) {
    return null;
  }

  const { lobbyState } = multiplayer;
  const missionSummary = [
    lobbyState.mission.stars === null ? null : `${lobbyState.mission.stars} star(s)`,
    lobbyState.mission.quests.length ? `${lobbyState.mission.quests.length} quest(s)` : null,
    lobbyState.mission.restrictions.length ? `${lobbyState.mission.restrictions.length} restriction(s)` : null,
  ].filter(Boolean);

  return (
    <Card sx={{ minWidth: 320, padding: 2 }}>
      <Typography variant="h6">Lobby</Typography>
      <Typography color="text.secondary" variant="body2">
        Code: {lobbyState.lobbyCode}
      </Typography>
      <Typography color="text.secondary" variant="body2">
        Mission Outcome: {missionSummary.length ? missionSummary.join(" · ") : "No synced report yet"}
      </Typography>
      <Divider sx={{ my: 1 }} />
      <List dense>
        {lobbyState.members.map((member: LobbyMember) => {
          const loadout = formatLoadout(member);
          return (
            <ListItem key={member.memberId} sx={{ alignItems: "flex-start", flexDirection: "column" }}>
              <ListItemText
                primary={member.displayName}
                secondary={member.isHost ? "Host" : "Member"}
              />
              <Grid container spacing={1}>
                {loadout.length
                  ? loadout.map((item, index) => (
                    <Grid key={`${member.memberId}-${item}-${index}`}>
                      <Chip label={item} size="small" />
                    </Grid>
                  ))
                  : <Grid><Typography color="text.secondary" variant="body2">No loadout selected</Typography></Grid>}
              </Grid>
            </ListItem>
          );
        })}
      </List>
    </Card>
  );
}
