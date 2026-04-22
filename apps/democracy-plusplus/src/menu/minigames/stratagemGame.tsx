import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
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
import { STRATAGEMS } from "../../constants/stratagems";
import { ItemIcon } from "../../utils/itemDisplay";
import { StratagemCodeDisplay, isStratagemDirection, normalizeStratagemInput, type StratagemDirection } from "../../utils/stratagemCode";
import { unlockAchievements } from "../../slices/achievementsSlice";
import { recordStratagemDrillScore, selectMinigames } from "../../slices/minigamesSlice";
import type { Item } from "../../types";

type GamePhase = "idle" | "playing" | "gameOver";
type PlayableStratagem = Item & { stratagemCode: StratagemDirection[] };

const ACTIVE_SET_SIZE = 4;
const START_TIME_MS = 5000;
const TIME_REDUCTION_MS = 200;
const MIN_TIME_MS = 1000;
const ERROR_FLASH_MS = 100;

const PLAYABLE_STRATAGEMS = STRATAGEMS.filter((item): item is PlayableStratagem => {
  const { stratagemCode } = item;
  return Array.isArray(stratagemCode) && stratagemCode.length > 0 && stratagemCode.every(isStratagemDirection);
});

function pickRandomStratagem(excludedNames: string[] = []) {
  const available = PLAYABLE_STRATAGEMS.filter((item) => !excludedNames.includes(item.displayName));
  const pool = available.length ? available : PLAYABLE_STRATAGEMS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildInitialQueue() {
  const queue: PlayableStratagem[] = [];

  while (queue.length < ACTIVE_SET_SIZE && PLAYABLE_STRATAGEMS.length > 0) {
    const next = pickRandomStratagem(queue.map((item) => item.displayName));
    if (!next) {
      break;
    }
    queue.push(next);
  }

  return queue;
}

function nextAllowedTimeMs(completedCount: number) {
  return Math.max(MIN_TIME_MS, START_TIME_MS - Math.floor(completedCount / 4) * TIME_REDUCTION_MS);
}

function shouldIgnoreInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA";
}

export default function StratagemGame({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dispatch = useDispatch();
  const { stratagemDrillBestScore } = useSelector(selectMinigames);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [visibleStratagems, setVisibleStratagems] = useState<PlayableStratagem[]>([]);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [allowedTimeMs, setAllowedTimeMs] = useState(START_TIME_MS);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [flashErrorUntil, setFlashErrorUntil] = useState<number | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);
  const gameOverHandledRef = useRef(false);

  const remainingTimeMs = phase === "playing" && deadlineMs !== null
    ? Math.max(0, deadlineMs - nowMs)
    : allowedTimeMs;
  const isFlashingError = flashErrorUntil !== null && flashErrorUntil > nowMs;
  const progressPercent = allowedTimeMs > 0 ? (remainingTimeMs / allowedTimeMs) * 100 : 0;

  const activeInstructions = useMemo(() => [
    "Enter codes with arrow keys or WASD.",
    "Only the first stratagem in the list accepts input.",
    "Mistakes reset that stratagem's progress but do not reset the timer.",
  ], []);

  function clearErrorTimeout() {
    if (errorTimeoutRef.current !== null) {
      window.clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }

  const resetGameState = useEffectEvent(() => {
    clearErrorTimeout();
    gameOverHandledRef.current = false;
    setPhase("idle");
    setVisibleStratagems([]);
    setProgress(0);
    setErrors(0);
    setCompletedCount(0);
    setAllowedTimeMs(START_TIME_MS);
    setDeadlineMs(null);
    setNowMs(Date.now());
    setFlashErrorUntil(null);
  });

  function handleClose() {
    resetGameState();
    onClose();
  }

  function startGame() {
    const queue = buildInitialQueue();
    const now = Date.now();

    setPhase("playing");
    setVisibleStratagems(queue);
    setProgress(0);
    setErrors(0);
    setCompletedCount(0);
    setAllowedTimeMs(START_TIME_MS);
    setDeadlineMs(now + START_TIME_MS);
    setNowMs(now);
    setFlashErrorUntil(null);
    gameOverHandledRef.current = false;
  }

  function advanceQueue(currentQueue: PlayableStratagem[]) {
    const remaining = currentQueue.slice(1);
    const replacement = pickRandomStratagem(remaining.map((item) => item.displayName));

    return replacement ? [...remaining, replacement] : remaining;
  }

  useEffect(() => {
    if (!open) {
      resetGameState();
    }

    return () => clearErrorTimeout();
  }, [open, resetGameState]);

  useEffect(() => {
    if (phase !== "gameOver" || gameOverHandledRef.current) {
      return;
    }

    gameOverHandledRef.current = true;
    dispatch(recordStratagemDrillScore({ value: completedCount }));
    if (completedCount >= 20) {
      dispatch(unlockAchievements({ value: ["stratagem-drill-ace"] }));
    }
  }, [completedCount, dispatch, phase]);

  useEffect(() => {
    if (phase !== "playing" || deadlineMs === null) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const nextNow = Date.now();
      setNowMs(nextNow);

      if (nextNow >= deadlineMs) {
        setPhase("gameOver");
        setDeadlineMs(null);
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [phase, deadlineMs]);

  useEffect(() => {
    if (!open || phase !== "playing") {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat || shouldIgnoreInputTarget(event.target)) {
        return;
      }

      const input = normalizeStratagemInput(event.key);
      if (!input) {
        return;
      }

      const currentStratagem = visibleStratagems[0];
      if (!currentStratagem) {
        return;
      }

      event.preventDefault();

      const expectedInput = currentStratagem.stratagemCode[progress];
      if (input === expectedInput) {
        const nextProgress = progress + 1;

        if (nextProgress >= currentStratagem.stratagemCode.length) {
          const nextCompletedCount = completedCount + 1;
          const nextAllowedTime = nextAllowedTimeMs(nextCompletedCount);
          const now = Date.now();

          setVisibleStratagems((currentQueue) => advanceQueue(currentQueue));
          setCompletedCount(nextCompletedCount);
          setAllowedTimeMs(nextAllowedTime);
          setProgress(0);
          setDeadlineMs(now + nextAllowedTime);
          setNowMs(now);
          setFlashErrorUntil(null);
          clearErrorTimeout();
          return;
        }

        setProgress(nextProgress);
        return;
      }

      const now = Date.now();
      clearErrorTimeout();
      setErrors((current) => current + 1);
      setProgress(0);
      setFlashErrorUntil(now + ERROR_FLASH_MS);
      errorTimeoutRef.current = window.setTimeout(() => {
        setFlashErrorUntil(null);
        errorTimeoutRef.current = null;
      }, ERROR_FLASH_MS);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, phase, visibleStratagems, progress, completedCount]);

  return <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
    <DialogTitle>Stratagem Drill</DialogTitle>
    <DialogContent dividers>
      {phase === "idle" && <Stack spacing={2}>
        <Typography variant="h6">Rapid-response stratagem practice</Typography>
        <Typography color="text.secondary">
          Enter each stratagem code before the timer runs out. Every four successful stratagems makes the next ones faster.
        </Typography>
        <Box component="ul" sx={{ pl: 3, m: 0 }}>
          {activeInstructions.map((instruction) => <Typography key={instruction} component="li">
            {instruction}
          </Typography>)}
        </Box>
      </Stack>}

      {phase === "playing" && <Stack spacing={3}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">Completed</Typography>
              <Typography variant="h4">{completedCount}</Typography>
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
              <Typography variant="overline" color="text.secondary">Time Per Stratagem</Typography>
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

        <Box>
          <LinearProgress color={remainingTimeMs < 1500 ? "error" : "primary"} variant="determinate" value={progressPercent} />
        </Box>

        <Stack spacing={2}>
          {visibleStratagems.map((stratagem, index) => {
            const isActive = index === 0;
            const showError = isActive && isFlashingError;

            return <Card
              key={`${stratagem.displayName}-${index}`}
              variant="outlined"
              sx={{
                p: 2,
                borderWidth: 2,
                borderColor: showError
                  ? "error.main"
                  : isActive
                    ? "primary.main"
                    : "divider",
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid>
                  <ItemIcon item={stratagem} width={72} minHeight={56} margin={0} bgcolor="black" />
                </Grid>
                <Grid size="grow">
                  <Stack spacing={1}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                      <Typography variant="h6">{stratagem.displayName}</Typography>
                      <Typography color={showError ? "error.main" : isActive ? "primary.main" : "text.secondary"}>
                        {isActive ? "Active" : "Queued"}
                      </Typography>
                    </Box>
                    <StratagemCodeDisplay
                      code={stratagem.stratagemCode}
                      progress={isActive ? progress : 0}
                      flashError={showError}
                      iconSize={20}
                      justifyContent="flex-start"
                    />
                  </Stack>
                </Grid>
              </Grid>
            </Card>;
          })}
        </Stack>
      </Stack>}

      {phase === "gameOver" && <Stack spacing={2} alignItems="center" textAlign="center" py={2}>
        <Typography variant="h4">Time&apos;s up</Typography>
        <Typography variant="h6">Score: {completedCount}</Typography>
        <Typography color="text.secondary">Errors: {errors}</Typography>
        <Typography color="text.secondary">Best Score: {Math.max(stratagemDrillBestScore, completedCount)}</Typography>
        {completedCount > stratagemDrillBestScore && <Typography color="success.main">New record</Typography>}
      </Stack>}
    </DialogContent>
    <DialogActions>
      {phase === "idle" && <Button onClick={startGame} variant="contained">Start</Button>}
      <Button onClick={handleClose}>{phase === "gameOver" ? "Close" : "Cancel"}</Button>
    </DialogActions>
  </Dialog>;
}
