import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { FORMS } from "../../constants/forms";
import { unlockAchievements } from "../../slices/achievementsSlice";
import { recordBureaucraticFormsScore, selectMinigames } from "../../slices/minigamesSlice";
import type { FormFieldPool } from "../../types";

type GamePhase = "idle" | "playing" | "gameOver";
type FormAction = "Approve" | "Reject" | "Escalate";
type FieldSeverity = "success" | "warning" | "error";
type FormField = {
  label: string;
  value: string;
  severity: FieldSeverity;
};
type BureaucraticForm = {
  title: string;
  subtitle: string;
  fields: FormField[];
  correctAction: FormAction;
};

const START_TIME_MS = 15000;
const TIME_REDUCTION_MS = 600;
const MIN_TIME_MS = 1000;
const MAX_ERRORS = 3;

const ACTION_KEYS: Record<string, FormAction> = {
  a: "Approve",
  A: "Approve",
  r: "Reject",
  R: "Reject",
  e: "Escalate",
  E: "Escalate",
};

function shouldIgnoreInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA";
}

function nextAllowedTimeMs(completedCount: number) {
  return Math.max(MIN_TIME_MS, START_TIME_MS - Math.floor(completedCount / 4) * TIME_REDUCTION_MS);
}

function randomChoice<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function colorForSeverity(severity: FieldSeverity) {
  return `${severity}.main` as const;
}

function severitiesForAction(action: FormAction): FieldSeverity[] {
  if (action === "Approve") {
    return ["success"];
  }
  if (action === "Escalate") {
    return ["success", "warning"];
  }
  return ["success", "warning", "error"];
}

function generateField(fieldPool: FormFieldPool, allowedSeverities: FieldSeverity[], forcedSeverity?: FieldSeverity): FormField {
  const severity = forcedSeverity ?? randomChoice(allowedSeverities);
  return {
    label: fieldPool.label,
    severity,
    value: randomChoice(fieldPool[severity]),
  };
}

function generateForm(): BureaucraticForm {
  const template = randomChoice(FORMS);
  const fieldCount = Math.min(template.possibleFields.length, Math.random() < 0.6 ? 2 : 3);
  const correctAction = randomChoice<FormAction>(["Approve", "Escalate", "Reject"]);
  const selectedFieldPools = shuffle(template.possibleFields).slice(0, fieldCount);
  const allowedSeverities = severitiesForAction(correctAction);
  const requiredSeverity = correctAction === "Approve"
    ? "success"
    : correctAction === "Escalate"
      ? "warning"
      : "error";
  const requiredFieldIndex = Math.floor(Math.random() * selectedFieldPools.length);

  const fields = selectedFieldPools.map((fieldPool, index) =>
    generateField(fieldPool, allowedSeverities, index === requiredFieldIndex ? requiredSeverity : undefined),
  );

  return {
    title: template.title,
    subtitle: template.subtitle,
    fields,
    correctAction,
  };
}

export default function FormsGame({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dispatch = useDispatch();
  const { bureaucraticFormsBestScore } = useSelector(selectMinigames);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [currentForm, setCurrentForm] = useState<BureaucraticForm | null>(null);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [allowedTimeMs, setAllowedTimeMs] = useState(START_TIME_MS);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [resolvedAction, setResolvedAction] = useState<FormAction | null>(null);
  const [reviewEndsGame, setReviewEndsGame] = useState(false);
  const gameOverHandledRef = useRef(false);

  const remainingTimeMs = phase === "playing" && deadlineMs !== null
    ? Math.max(0, deadlineMs - nowMs)
    : allowedTimeMs;
  const progressPercent = allowedTimeMs > 0 ? (remainingTimeMs / allowedTimeMs) * 100 : 0;
  const isReviewingAnswer = resolvedAction !== null;
  const wasAnswerCorrect = currentForm && resolvedAction
    ? resolvedAction === currentForm.correctAction
    : null;
  const bestScore = Math.max(bureaucraticFormsBestScore, score);

  const instructions = useMemo(() => [
    "Review each form and choose Approve (A), Escalate (E), or Reject (R).",
    "The field values are shown without their classification colors until you commit to a choice.",
    "Once you answer, the form reveals the true field severities: any red means Reject, otherwise any yellow means Escalate, otherwise all green means Approve.",
    "Press any key after reviewing the answer to move on. The run ends after 3 errors.",
  ], []);

  function resetGameState() {
    gameOverHandledRef.current = false;
    setPhase("idle");
    setCurrentForm(null);
    setScore(0);
    setErrors(0);
    setAllowedTimeMs(START_TIME_MS);
    setDeadlineMs(null);
    setNowMs(Date.now());
    setResolvedAction(null);
    setReviewEndsGame(false);
  }

  function handleClose() {
    resetGameState();
    onClose();
  }

  function startGame() {
    const now = Date.now();
    gameOverHandledRef.current = false;
    setPhase("playing");
    setCurrentForm(generateForm());
    setScore(0);
    setErrors(0);
    setAllowedTimeMs(START_TIME_MS);
    setDeadlineMs(now + START_TIME_MS);
    setNowMs(now);
    setResolvedAction(null);
    setReviewEndsGame(false);
  }

  function advanceToNextForm(nextScore: number) {
    const nextAllowedTime = nextAllowedTimeMs(nextScore);
    const now = Date.now();

    setCurrentForm(generateForm());
    setAllowedTimeMs(nextAllowedTime);
    setDeadlineMs(now + nextAllowedTime);
    setNowMs(now);
    setResolvedAction(null);
    setReviewEndsGame(false);
  }

  const resolveForm = useEffectEvent((action: FormAction) => {
    if (!currentForm || isReviewingAnswer) {
      return;
    }

    const correct = action === currentForm.correctAction;
    const nextScore = correct ? score + 1 : score;
    const nextErrors = correct ? errors : errors + 1;
    const now = Date.now();

    if (correct) {
      setScore(nextScore);
    } else {
      setErrors(nextErrors);
    }

    setResolvedAction(action);
    setReviewEndsGame(nextErrors >= MAX_ERRORS);
    setDeadlineMs(null);
    setNowMs(now);
  });

  useEffect(() => {
    if (!open) {
      resetGameState();
    }
  }, [open]);

  useEffect(() => {
    if (phase !== "playing") {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const nextNow = Date.now();
      setNowMs(nextNow);

      if (deadlineMs !== null && nextNow >= deadlineMs) {
        setPhase("gameOver");
        setDeadlineMs(null);
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [deadlineMs, phase]);

  useEffect(() => {
    if (phase !== "gameOver" || gameOverHandledRef.current) {
      return;
    }

    gameOverHandledRef.current = true;
    dispatch(recordBureaucraticFormsScore({ value: score }));
    if (score >= 20) {
      dispatch(unlockAchievements({ value: ["bureaucratic-forms-ace"] }));
    }
  }, [dispatch, phase, score]);

  useEffect(() => {
    if (!open || phase !== "playing") {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat || shouldIgnoreInputTarget(event.target)) {
        return;
      }

      if (isReviewingAnswer) {
        event.preventDefault();

        if (reviewEndsGame) {
          setPhase("gameOver");
          setDeadlineMs(null);
          return;
        }

        advanceToNextForm(score);
        return;
      }

      const action = ACTION_KEYS[event.key];
      if (!action) {
        return;
      }

      event.preventDefault();
      resolveForm(action);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReviewingAnswer, open, phase, resolveForm, reviewEndsGame, score]);

  return <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
    <DialogTitle>Bureaucratic Forms Review</DialogTitle>
    <DialogContent dividers>
      {phase === "idle" && <Stack spacing={2}>
        <Typography variant="h6">Mandatory administrative excellence</Typography>
        <Typography color="text.secondary">
          Process a stream of Super Earth paperwork before the desk clock expires. Each form is built from several fields, and your job is to classify the whole form based on the most severe issue it contains.
        </Typography>
        <Box component="ul" sx={{ pl: 3, m: 0 }}>
          {instructions.map((instruction) => <Typography key={instruction} component="li">{instruction}</Typography>)}
        </Box>
      </Stack>}

      {phase === "playing" && currentForm && <Stack spacing={3}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">Processed</Typography>
              <Typography variant="h4">{score}</Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">Errors</Typography>
              <Typography variant="h4">{errors}</Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">Review Window</Typography>
              <Typography variant="h4">{(allowedTimeMs / 1000).toFixed(1)}s</Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">Time Remaining</Typography>
              <Typography variant="h4">{(remainingTimeMs / 1000).toFixed(1)}s</Typography>
            </Card>
          </Grid>
        </Grid>

        <LinearProgress color={remainingTimeMs < 1500 ? "error" : "primary"} variant="determinate" value={progressPercent} />

        <Card
          variant="outlined"
          sx={{
            p: 3,
            borderWidth: 2,
            borderColor: wasAnswerCorrect === false
              ? "error.main"
              : wasAnswerCorrect === true
                ? "success.main"
                : "divider",
          }}
        >
          <Stack spacing={2}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
              <Box>
                <Typography variant="h5">{currentForm.title}</Typography>
                <Typography color="text.secondary">{currentForm.subtitle}</Typography>
              </Box>
              <Chip
                label={isReviewingAnswer ? `Correct Action: ${currentForm.correctAction}` : "Form In Review"}
                color={isReviewingAnswer ? (currentForm.correctAction === "Approve" ? "success" : currentForm.correctAction === "Escalate" ? "warning" : "error") : "primary"}
                variant="outlined"
              />
            </Box>

            <Grid container spacing={2}>
              {currentForm.fields.map((field) => <Grid key={`${currentForm.title}-${field.label}`} size={{ xs: 12, md: currentForm.fields.length === 2 ? 6 : 4 }}>
                <Card variant="outlined" sx={{ p: 2, height: "100%" }}>
                  <Typography variant="overline" color="text.secondary">{field.label}</Typography>
                  <Typography color={isReviewingAnswer ? colorForSeverity(field.severity) : "text.primary"}>
                    {field.value}
                  </Typography>
                </Card>
              </Grid>)}
            </Grid>

            {isReviewingAnswer && <Typography color={wasAnswerCorrect ? "success.main" : "error.main"}>
              {wasAnswerCorrect
                ? `Approved judgement recorded: ${resolvedAction}. Press any key to continue.`
                : reviewEndsGame
                  ? `Incorrect. ${currentForm.correctAction} was required. Press any key to close the desk after your third error.`
                  : `Incorrect. ${currentForm.correctAction} was required. Press any key to continue.`}
            </Typography>}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button variant="contained" color="success" onClick={() => resolveForm("Approve")} disabled={isReviewingAnswer}>Approve (A)</Button>
              <Button variant="contained" color="warning" onClick={() => resolveForm("Escalate")} disabled={isReviewingAnswer}>Escalate (E)</Button>
              <Button variant="contained" color="error" onClick={() => resolveForm("Reject")} disabled={isReviewingAnswer}>Reject (R)</Button>
            </Stack>
          </Stack>
        </Card>
      </Stack>}

      {phase === "gameOver" && <Stack spacing={2} alignItems="center" textAlign="center" py={2}>
        <Typography variant="h4">Desk Closed</Typography>
        <Typography variant="h6">Score: {score}</Typography>
        <Typography color="text.secondary">Errors: {errors}</Typography>
        <Typography color="text.secondary">Best Score: {bestScore}</Typography>
        {score > bureaucraticFormsBestScore && <Typography color="success.main">New record</Typography>}
      </Stack>}
    </DialogContent>
    <DialogActions>
      {phase === "idle" && <Button onClick={startGame} variant="contained">Start</Button>}
      <Button onClick={handleClose}>{phase === "gameOver" ? "Close" : "Cancel"}</Button>
    </DialogActions>
  </Dialog>;
}
