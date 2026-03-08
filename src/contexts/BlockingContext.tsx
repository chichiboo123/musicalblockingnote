import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import type { BlockingState } from "@/types/blocking";

interface BlockingContextType {
  undoHistory: BlockingState[];
  redoHistory: BlockingState[];
  currentState: BlockingState | null;
  addToHistory: (state: BlockingState) => void;
  undo: () => BlockingState | null;
  redo: () => BlockingState | null;
  resetState: () => void;
  exportRef: React.RefObject<HTMLDivElement>;
}

const BlockingContext = createContext<BlockingContextType | null>(null);

export const BlockingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [undoHistory, setUndoHistory] = useState<BlockingState[]>([]);
  const [redoHistory, setRedoHistory] = useState<BlockingState[]>([]);
  const [currentState, setCurrentState] = useState<BlockingState | null>(null);
  const exportRef = useRef<HTMLDivElement>(null!);

  const addToHistory = useCallback((state: BlockingState) => {
    setUndoHistory((prev) => {
      if (currentState) return [...prev, currentState];
      return prev;
    });
    setCurrentState(state);
    setRedoHistory([]);
  }, [currentState]);

  const undo = useCallback(() => {
    if (undoHistory.length === 0) return null;
    const prev = undoHistory[undoHistory.length - 1];
    setUndoHistory((h) => h.slice(0, -1));
    if (currentState) setRedoHistory((r) => [...r, currentState]);
    setCurrentState(prev);
    return prev;
  }, [undoHistory, currentState]);

  const redo = useCallback(() => {
    if (redoHistory.length === 0) return null;
    const next = redoHistory[redoHistory.length - 1];
    setRedoHistory((r) => r.slice(0, -1));
    if (currentState) setUndoHistory((h) => [...h, currentState]);
    setCurrentState(next);
    return next;
  }, [redoHistory, currentState]);

  const resetState = useCallback(() => {
    setUndoHistory([]);
    setRedoHistory([]);
    setCurrentState(null);
  }, []);

  return (
    <BlockingContext.Provider value={{ undoHistory, redoHistory, currentState, addToHistory, undo, redo, resetState, exportRef }}>
      {children}
    </BlockingContext.Provider>
  );
};

export const useBlockingContext = () => {
  const ctx = useContext(BlockingContext);
  if (!ctx) throw new Error("useBlockingContext must be used within BlockingProvider");
  return ctx;
};
