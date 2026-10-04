import { Grid, List, ListItem, ListItemText } from "@mui/material";
import { selectMission } from "../../slices/missionSlice";
import { useSelector } from "react-redux";
import type { Restriction } from "../../types";
import SectionHeading from "../../utils/sectionHeading";

export default function Restrictions() {
  const mission = useSelector(selectMission);

  return <Grid direction="column">
    <SectionHeading
      subtitle="Operational constraints that reward disciplined adherence in the field."
      title="Rules of Engagement"
    />
    <List>
      {mission.restrictions.map((restriction: Restriction) => <ListItem key={restriction.displayName}>
        <ListItemText
          primary={restriction.displayName}
          secondary={restriction.description} />
      </ListItem>)}
    </List>
  </Grid>;
}
