import { describe, it, expect, beforeEach } from "vitest";
import { readSavedProjects } from "@/lib/recent";

const set = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

describe("readSavedProjects", () => {
  beforeEach(() => localStorage.clear());

  it("reports nothing when there is no saved work", () => {
    expect(readSavedProjects()).toEqual([]);
  });

  it("ignores an untouched default project", () => {
    set("choreography-project-v1:sections", [{ id: 1, lyrics: "", blockingElements: [] }]);
    expect(readSavedProjects()).toEqual([]);
  });

  it("surfaces a choreography project once it has content", () => {
    set("choreography-project-v1:title", "패딩턴");
    set("choreography-project-v1:cast", [{ id: "a", name: "패딩턴", color: "#e6194b" }]);
    set("choreography-project-v1:sections", [
      { id: 1, lyrics: "", blockingElements: [{ id: "e1", type: "character", position: { x: 1, y: 1 } }] },
    ]);
    const [project] = readSavedProjects();
    expect(project.mode).toBe("choreography");
    expect(project.title).toBe("패딩턴");
    expect(project.summary).toContain("인물 1명");
    expect(project.summary).toContain("요소 1개");
  });

  it("counts lyrics-only work as content and falls back to a placeholder title", () => {
    set("choreography-project-v1:sections", [{ id: 1, lyrics: "런던 거리 위", blockingElements: [] }]);
    const [project] = readSavedProjects();
    expect(project.title).toBe("제목 없는 안무 동선");
    expect(project.elementCount).toBe(0);
  });

  it("summarises scene projects across groups and reads the legacy cast string", () => {
    set("scene-project-v1:characters", "패딩턴, 주디");
    set("scene-project-v1:groups", [
      { id: 1, title: "1장", scenes: [{ id: 1, script: "등장", blockingElements: [] }] },
      { id: 2, title: "2장", scenes: [{ id: 1, script: "", blockingElements: [] }] },
    ]);
    const [project] = readSavedProjects();
    expect(project.mode).toBe("scene");
    expect(project.summary).toBe("2개 장 · 장면 2개 · 인물 2명");
  });

  it("survives corrupted storage entries", () => {
    localStorage.setItem("choreography-project-v1:sections", "{not json");
    expect(readSavedProjects()).toEqual([]);
  });
});
