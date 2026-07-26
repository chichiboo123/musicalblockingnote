import { useCallback, useMemo } from "react";
import { DEFAULT_SIZE_PCT } from "@/lib/geometry";
import type { BlockingElement, StagePoint } from "@/types/blocking";

type Updater = (sectionIndex: number, fn: (els: BlockingElement[]) => BlockingElement[]) => void;

/**
 * Every element mutation both editors need, in one place. The two pages used to
 * carry near-identical copies of these handlers, which is how the scene editor
 * ended up silently missing resize.
 */
export function useElementActions(update: Updater, snapshot: () => void) {
  const move = useCallback(
    (id: string, position: { x: number; y: number }, section: number) =>
      update(section, (els) => els.map((el) => (el.id === id ? { ...el, position, u: "%" as const } : el))),
    [update]
  );

  const resize = useCallback(
    (id: string, size: { width: number; height: number }, section: number) =>
      update(section, (els) => els.map((el) => (el.id === id ? { ...el, size, u: "%" as const } : el))),
    [update]
  );

  const rotate = useCallback(
    (id: string, rotation: number, section: number) =>
      update(section, (els) => els.map((el) => (el.id === id ? { ...el, rotation } : el))),
    [update]
  );

  const add = useCallback(
    (element: BlockingElement, section: number) => {
      snapshot();
      update(section, (els) => [...els, element]);
    },
    [update, snapshot]
  );

  const remove = useCallback(
    (id: string, section: number) => {
      snapshot();
      update(section, (els) => els.filter((el) => el.id !== id));
    },
    [update, snapshot]
  );

  const replaceAll = useCallback(
    (section: number, next: BlockingElement[]) => update(section, () => next),
    [update]
  );

  const duplicate = useCallback(
    (id: string, section: number): string | null => {
      let newId: string | null = null;
      snapshot();
      update(section, (els) => {
        const source = els.find((el) => el.id === id);
        if (!source) return els;
        newId = `${source.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const offset = 4; // percent, so the copy is visibly on top of the original
        const copy: BlockingElement = {
          ...source,
          id: newId,
          position: { x: source.position.x + offset, y: source.position.y + offset },
          points: source.points?.map((p) => ({ x: p.x + offset, y: p.y + offset })),
        };
        return [...els, copy];
      });
      return newId;
    },
    [update, snapshot]
  );

  const reorder = useCallback(
    (id: string, to: "front" | "back", section: number) => {
      snapshot();
      update(section, (els) => {
        const target = els.find((el) => el.id === id);
        if (!target) return els;
        const rest = els.filter((el) => el.id !== id);
        return to === "front" ? [...rest, target] : [target, ...rest];
      });
    },
    [update, snapshot]
  );

  const recolor = useCallback(
    (id: string, color: string, section: number) => {
      snapshot();
      update(section, (els) => els.map((el) => (el.id === id ? { ...el, color } : el)));
    },
    [update, snapshot]
  );

  const setText = useCallback(
    (id: string, text: string, section: number) => {
      snapshot();
      update(section, (els) => els.map((el) => (el.id === id ? { ...el, text } : el)));
    },
    [update, snapshot]
  );

  const addMovePath = useCallback(
    (points: StagePoint[], color: string, label: string | undefined, section: number) => {
      snapshot();
      const element: BlockingElement = {
        id: `move-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "move",
        color,
        label,
        points,
        position: points[0] ?? { x: 50, y: 50 },
        size: DEFAULT_SIZE_PCT.move,
        u: "%",
      };
      update(section, (els) => [...els, element]);
    },
    [update, snapshot]
  );

  return useMemo(
    () => ({ move, resize, rotate, add, remove, replaceAll, duplicate, reorder, recolor, setText, addMovePath }),
    [move, resize, rotate, add, remove, replaceAll, duplicate, reorder, recolor, setText, addMovePath]
  );
}
