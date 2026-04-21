import { useMemo, useState } from "react";
import { Box, Card, Chip, Divider, Grid, IconButton, Stack, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useSelector } from "react-redux";
import { getItem } from "../constants";
import { selectMultiplayer } from "../slices/multiplayerSlice";
import type { Item, LobbyMember } from "../types";
import { CompactItemDisplay } from "../utils/itemDisplay";

function memberLoadoutItems(member: LobbyMember) {
  return [
    member.loadout.primary,
    member.loadout.secondary,
    member.loadout.throwable,
    member.loadout.armorPassive,
    member.loadout.booster,
    ...member.loadout.stratagems,
  ]
    .map((itemName) => itemName ? getItem(itemName) : null)
    .filter((item): item is Item => Boolean(item));
}

export default function LobbyPanel() {
  const multiplayer = useSelector(selectMultiplayer);
  const [open, setOpen] = useState(true);

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
    <Box
      sx={{
        position: "fixed",
        right: 16,
        top: 96,
        zIndex: (theme) => theme.zIndex.drawer - 1,
        display: "flex",
        alignItems: "flex-start",
      }}
    >
      <Card
        variant="outlined"
        sx={{
          width: open ? 700 : 0,
          opacity: open ? 1 : 0,
          overflow: "hidden",
          transition: "width 180ms ease, opacity 180ms ease",
          pointerEvents: open ? "auto" : "none",
          backgroundColor: "rgba(18, 18, 18, 0.96)",
          backdropFilter: "blur(8px)",
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          boxShadow: 6,
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">Lobby</Typography>
          <Typography color="text.secondary" variant="body2">
            Code: {lobbyState.lobbyCode}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Mission Outcome: {missionSummary.length ? missionSummary.join(" · ") : "No synced report yet"}
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1.5}>
            {lobbyState.members.map((member) => {
              const loadout = memberLoadoutItems(member);

              return (
                <Box key={member.memberId}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
                    <Typography variant="subtitle2">{member.displayName}</Typography>
                    <Chip
                      label={member.isHost ? "Host" : "Member"}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  {loadout.length ? (
                    <Grid container spacing={0.75}>
                      {loadout.map((item, index) => (
                        <>
                          <Grid key={`${member.memberId}-${item.displayName}-${index}`}>
                            <CompactItemDisplay item={item} />
                          </Grid>
                          {(index === 3 || index === 4) && <Divider orientation='vertical'/>}
                        </>
                      ))}
                    </Grid>
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      No loadout selected
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Card>
      <Card
        variant="outlined"
        sx={{
          ml: open ? 0 : -0.5,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          backgroundColor: "rgba(18, 18, 18, 0.98)",
          boxShadow: 6,
        }}
      >
        <IconButton aria-label={open ? "Collapse lobby panel" : "Expand lobby panel"} onClick={() => setOpen((value) => !value)}>
          {open ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Card>
    </Box>
  );
}
