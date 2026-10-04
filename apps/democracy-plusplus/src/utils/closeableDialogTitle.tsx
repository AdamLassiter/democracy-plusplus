import CloseIcon from "@mui/icons-material/Close";
import { DialogTitle, IconButton } from "@mui/material";
import type { ReactNode } from "react";

export default function CloseableDialogTitle({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <DialogTitle sx={{ position: "relative", pr: 7 }}>
      {children}
      <IconButton
        aria-label="Close dialog"
        onClick={onClose}
        sx={{
          minHeight: 44,
          minWidth: 44,
          position: "absolute",
          right: 8,
          top: 8,
        }}
      >
        <CloseIcon />
      </IconButton>
    </DialogTitle>
  );
}
