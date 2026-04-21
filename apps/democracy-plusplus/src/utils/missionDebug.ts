import { useEffect, useRef } from "react";

const MAX_RENDER_LOGS = 40;

function isMissionDebugEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  const globalDebugFlag = (window as Window & { __MISSION_DEBUG__?: boolean }).__MISSION_DEBUG__;
  if (typeof globalDebugFlag === "boolean") {
    return globalDebugFlag;
  }

  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function serialise(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserialisable]";
  }
}

export function logMissionDebug(label: string, data?: unknown) {
  if (!isMissionDebugEnabled()) {
    return;
  }

  if (data === undefined) {
    console.debug(`[mission-debug] ${label}`);
    return;
  }

  console.debug(`[mission-debug] ${label}`, data);
}

export function useMissionDebugRender(name: string, snapshot: unknown) {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  if (!isMissionDebugEnabled() || renderCountRef.current > MAX_RENDER_LOGS) {
    return;
  }

  console.debug(`[mission-debug] render ${name} #${renderCountRef.current}`, snapshot);
}

export function useMissionDebugEffect(name: string, trackedValues: Record<string, unknown>) {
  const previousRef = useRef<Record<string, string> | null>(null);
  const serialisedEntries = Object.entries(trackedValues).map(([key, value]) => [key, serialise(value)] as const);

  useEffect(() => {
    if (!isMissionDebugEnabled()) {
      return;
    }

    const current = Object.fromEntries(serialisedEntries);
    const previous = previousRef.current;

    if (!previous) {
      console.debug(`[mission-debug] effect ${name} initial`, trackedValues);
      previousRef.current = current;
      return;
    }

    const changedEntries = Object.keys(current)
      .filter((key) => previous[key] !== current[key])
      .map((key) => ({
        key,
        previous: previous[key],
        next: current[key],
      }));

    if (changedEntries.length) {
      console.debug(`[mission-debug] effect ${name} changed`, changedEntries);
    } else {
      console.debug(`[mission-debug] effect ${name} re-ran without tracked changes`);
    }

    previousRef.current = current;
  }, serialisedEntries.map(([, value]) => value));
}
