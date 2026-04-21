import { Box, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

export type StratagemDirection = "Up" | "Down" | "Left" | "Right";

const STRATAGEM_DIRECTION_ICONS = {
  Up: ArrowUpwardIcon,
  Down: ArrowDownwardIcon,
  Left: ArrowBackIcon,
  Right: ArrowForwardIcon,
} as const;

export function isStratagemDirection(direction: string): direction is StratagemDirection {
  return direction in STRATAGEM_DIRECTION_ICONS;
}

export function normalizeStratagemInput(key: string): StratagemDirection | null {
  const keyMap: Record<string, StratagemDirection> = {
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    w: "Up",
    W: "Up",
    s: "Down",
    S: "Down",
    a: "Left",
    A: "Left",
    d: "Right",
    D: "Right",
  };

  return keyMap[key] ?? null;
}

export function StratagemCodeDisplay({
  code,
  progress = 0,
  flashError = false,
  iconSize = 16,
  justifyContent = "center",
}: {
  code: string[];
  progress?: number;
  flashError?: boolean;
  iconSize?: number;
  justifyContent?: "center" | "flex-start";
}) {
  return <Box sx={{
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent,
    gap: 0.5,
    minHeight: 28,
    color: "text.secondary",
  }}>
    {code.map((direction, index) => {
      const DirectionIcon = isStratagemDirection(direction) ? STRATAGEM_DIRECTION_ICONS[direction] : null;
      const color = flashError
        ? "error.main"
        : index < progress
          ? "success.main"
          : "text.secondary";

      return DirectionIcon
        ? <DirectionIcon key={`${direction}-${index}`} sx={{ fontSize: iconSize, color }} />
        : <Typography key={`${direction}-${index}`} sx={{ fontSize: Math.max(9, iconSize - 3), color }}>
          {direction}
        </Typography>;
    })}
  </Box>;
}
