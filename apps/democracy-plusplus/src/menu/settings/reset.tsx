import type { MouseEvent, MouseEventHandler } from "react";
import { useDispatch } from "react-redux";
import { persistor } from "../../slices";
import { Button } from "@mui/material";

export default function ResetAppState({ onClick }: { onClick: MouseEventHandler<HTMLButtonElement> }) {
  const dispatch = useDispatch();

  function handleReset(event: MouseEvent<HTMLButtonElement>) {
    const confirmed = window.confirm('Are you sure you want to reset the app state? This will clear ALL stored data.');
    if (confirmed) {
      persistor.purge();
      dispatch({ type: 'RESET_APP' });
      onClick(event);
    }
  }

  return (
    <Button onClick={handleReset} color="error" variant="outlined">
      Reset State
    </Button>
  );
};
