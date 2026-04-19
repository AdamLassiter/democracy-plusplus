export function shouldIgnoreSecretTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA";
}

export function normalizeArrowKey(key: string) {
  const keyMap = {
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
  } as const;

  return keyMap[key as keyof typeof keyMap] ?? null;
}

export function nextSecretSequenceIndex(
  input: string,
  sequence: readonly string[],
  currentIndex: number,
  lastKeyTime: number,
  now: number,
  maxDelayMs: number,
) {
  const timedOut = currentIndex > 0 && now - lastKeyTime > maxDelayMs;
  const nextIndex = timedOut ? 0 : currentIndex;
  const expected = sequence[nextIndex];

  if (input === expected) {
    return {
      index: nextIndex + 1,
      lastKeyTime: now,
      completed: nextIndex + 1 === sequence.length,
    };
  }

  return {
    index: input === sequence[0] ? 1 : 0,
    lastKeyTime: input === sequence[0] ? now : 0,
    completed: false,
  };
}
