import { Box, Tab, Tabs, Typography } from "@mui/material";
import { useState, type SyntheticEvent } from "react";
import { useSelector } from "react-redux";
import { selectLog } from "../../slices/logSlice";
import MissionsLog from "./missionsLog";
import PurchasesLog from "./purchasesLog";
import SectionHeading from "../../utils/sectionHeading";

const LOG_TABS = [
  { key: "missions", label: "Missions", Component: MissionsLog },
  { key: "purchases", label: "Purchases", Component: PurchasesLog },
] as const;

export default function Log() {
  const [value, setValue] = useState(0);
  const { entries } = useSelector(selectLog);

  function handleChange(_event: SyntheticEvent, newValue: number) {
    setValue(newValue);
  }

  const CurrentTab = LOG_TABS[value].Component;

  return (
    <>
      <SectionHeading
        subtitle="Review completed operations, requisitions and the running cost of spreading Managed Democracy."
        title="Run Log"
      />
      {!entries.length && (
        <Typography color="gray" paddingTop={2}>
          No logged activity yet.
        </Typography>
      )}
      {!!entries.length && (
        <>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={value} onChange={handleChange}>
              {LOG_TABS.map((tab) => (
                <Tab key={tab.key} label={tab.label} />
              ))}
            </Tabs>
          </Box>
          <Box sx={{ pt: 2 }}>
            <CurrentTab entries={entries} />
          </Box>
        </>
      )}
    </>
  );
}
