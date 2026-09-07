import { useCallback, useEffect, useState } from "react";

export function readQuery() {
  return new URLSearchParams(window.location.search);
}

export function updateQuery(values: Record<string, string | null>, push = false) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  window.history[push ? "pushState" : "replaceState"]({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function retainQueryKeys(allowedKeys: string[]) {
  const allowed = new Set(allowedKeys);
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of [...url.searchParams.keys()]) {
    if (!allowed.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) {
    window.history.replaceState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export function useQueryVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    function update() {
      setVersion((value) => value + 1);
    }
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return version;
}

export function useQueryValue(key: string, fallback = "") {
  useQueryVersion();
  const value = readQuery().get(key) ?? fallback;
  const setValue = useCallback((next: string | null, push = false) => updateQuery({ [key]: next }, push), [key]);
  return [value, setValue] as const;
}
