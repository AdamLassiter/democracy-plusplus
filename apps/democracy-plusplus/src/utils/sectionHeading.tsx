import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";

export default function SectionHeading({
  title,
  subtitle,
  meta,
  actions,
  sx,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box sx={sx}>
      <Box
        sx={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 1 }}
      >
        <Typography variant="h5">{title}</Typography>
        {actions}
        {meta && (
          <Typography color="text.secondary" variant="subtitle1">
            {meta}
          </Typography>
        )}
      </Box>
      {subtitle && (
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.25 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
