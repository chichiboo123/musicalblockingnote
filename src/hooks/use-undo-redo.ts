import { useCallback, useRef, useState } from "react";

const MAX_HISTORY = 100;

export function useUndoRedo<T>() {
  const [undoStack, setUndoStack] = useState<T[]>([]);
  const [redoStack, setRedoStack] = useState<T[]>([]);
  const lastSnapshotRef = useRef<string | null>(null);

  const push = useCallback((snapshot: T) => {
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSnapshotRef.current) return;
    lastSnapshotRef.current = serialized;
    setUndoStack((prev) => {
      const next = [...prev, snapshot];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback((current: T): T | null => {
    if (undoStack.length === 0) return null;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [...r, current]);
    lastSnapshotRef.current = JSON.stringify(prev);
    return prev;
  }, [undoStack]);

  const redo = useCallback((current: T): T | null => {
    if (redoStack.length === 0) return null;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((s) => [...s, current]);
    lastSnapshotRef.current = JSON.stringify(next);
    return next;
  }, [redoStack]);

  const reset = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    lastSnapshotRef.current = null;
  }, []);

  return {
    push,
    undo,
    redo,
    reset,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
