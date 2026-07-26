/** A point on the stage, stored as a percentage (0–100) of the stage box so it
 *  survives resizing, exports and different screen sizes. */
export interface StagePoint {
  x: number;
  y: number;
}

export type ElementType = "character" | "path" | "custom" | "text" | "move";

export interface BlockingElement {
  id: string;
  type: ElementType;
  svg?: string;
  color?: string;
  label?: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  rotation?: number;
  /** Waypoints for a `move` element (percent of the stage box). */
  points?: StagePoint[];
  /** Free text for a `text` element. */
  text?: string;
  /** Coordinate unit marker. `"%"` = stage-relative (current format); absent = legacy pixels. */
  u?: "%";
}

/** A cast member. Colors are bound to the person, not to their list position,
 *  so renaming or reordering the cast never re-colors what is already staged. */
export interface Character {
  id: string;
  name: string;
  color: string;
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

/** A group of scenes belonging to one act (예: 1장). Collapsible in the UI. */
export interface SceneGroup {
  id: number;
  title: string;
  collapsed?: boolean;
  scenes: SceneSection[];
}

export interface BlockingState {
  title: string;
  cast: Character[];
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

/** Whose left/right the stage labels use. `performer` is the theatre standard. */
export type StageOrientation = "performer" | "audience";

/** A pending element insertion requested from the palette. */
export interface AddElementPayload {
  type: ElementType;
  svg?: string;
  color?: string;
  label?: string;
  text?: string;
}

export const CHARACTER_COLORS = [
  "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
  "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
  "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
  "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080",
  "#dcbeff", "#b0e0e6", "#ffc0cb", "#ff4500", "#00ff00",
  "#1e90ff", "#ff69b4", "#7fffd4", "#dda0dd", "#4682b4",
];
