import { Typography } from "@mui/material";

export function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function SectionTimestamp({ timestamp }: { timestamp: string }) {
  return <Typography variant="body2" color="text.secondary">
    {formatTimestamp(timestamp)}
  </Typography>;
}
