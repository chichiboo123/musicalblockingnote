import { useEffect, useRef, useState } from "react";

type SaveStatus = "idle" | "saving" | "saved";

const listeners = new Set<(status: SaveStatus) => void>();
let currentStatus: SaveStatus = "idle";
const pendingKeys = new Set<string>();
let savedTimer: number | null = null;

function setStatus(s: SaveStatus) {
  currentStatus = s;
  listeners.forEach((fn) => fn(s));
}

export function useSaveStatus() {
  const [status, setLocal] = useState<SaveStatus>(currentStatus);
  useEffect(() => {
    listeners.add(setLocal);
    return () => {
      listeners.delete(setLocal);
    };
  }, []);
  return status;
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return initialValue;
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  });

  const valueRef = useRef(value);
  valueRef.current = value;
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    pendingKeys.add(key);
    setStatus("saving");
    const handle = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(valueRef.current));
      } catch {
        // storage may be full or unavailable; ignore silently
      }
      pendingKeys.delete(key);
      if (pendingKeys.size === 0) {
        setStatus("saved");
        if (savedTimer != null) window.clearTimeout(savedTimer);
        savedTimer = window.setTimeout(() => setStatus("idle"), 1500);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [key, value]);

  return [value, setValue] as const;
}

export function clearPersistentState(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
