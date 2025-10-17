import { useSelector } from "react-redux";
import { selectCredits } from "../../slices/creditsSlice";
import { Typography } from "@mui/material";

export default function Stats() {
  const { credits } = useSelector(selectCredits);

  return <>
    <Typography variant="h4">Credits: {credits}</Typography>
  </>;
}