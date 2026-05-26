import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(valueRef.current));
      } catch {
        // storage may be full or unavailable; ignore silently
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
