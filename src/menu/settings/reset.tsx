import { useDispatch } from "react-redux";
import { persistor } from "../../slices";
import { Button } from "@mui/material";

export default function ResetAppState({ onClick }) {
  const dispatch = useDispatch();

  function handleReset(event) {
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
