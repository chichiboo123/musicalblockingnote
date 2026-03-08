export interface BlockingElement {
  id: string;
  type: "character" | "path" | "custom";
  svg?: string;
  color?: string;
  label?: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  rotation?: number;
}

export interface VerseSection {
  id: number;
  lyrics: string;
  blockingElements: BlockingElement[];
}

export interface SceneSection {
  id: number;
  script: string;
  blockingElements: BlockingElement[];
}

export interface BlockingState {
  title: string;
  characters: string;
  verseSections: VerseSection[];
  customPatterns: CustomPattern[];
}

export interface CustomPattern {
  id: string;
  svg: string;
  type: "custom";
}

export interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  targetId: string | null;
  sectionIndex: number;
}

export const CHARACTER_COLORS = [
  "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
  "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
  "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
  "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080",
  "#dcbeff", "#b0e0e6", "#ffc0cb", "#ff4500", "#00ff00",
  "#1e90ff", "#ff69b4", "#7fffd4", "#dda0dd", "#4682b4",
];
