import React, { useState } from "react";
import { Plus, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PersonIcon from "@/components/PersonIcon";
import { makeCharacter } from "@/lib/cast";
import { readableTextColor } from "@/lib/utils";
import { CHARACTER_COLORS, type Character } from "@/types/blocking";

interface CastEditorProps {
  cast: Character[];
  onChange: (cast: Character[]) => void;
  /** Called before a mutation so it can be captured in the undo history. */
  onBeforeChange?: () => void;
}

/** Size the inline rename field to its content — Hangul is about 2ch per glyph. */
const nameWidthCh = (name: string) =>
  Math.max(4, [...name].reduce((n, ch) => n + (/[ᄀ-ᇿ㄰-㆏가-힯一-鿿]/.test(ch) ? 2 : 1), 0) + 1);

/**
 * Cast members are chips with an explicit color, instead of a comma-separated
 * string whose colors silently shuffled whenever a name was added or removed.
 */
const CastEditor: React.FC<CastEditorProps> = ({ cast, onChange, onBeforeChange }) => {
  const [draft, setDraft] = useState("");

  const commit = (next: Character[]) => {
    onBeforeChange?.();
    onChange(next);
  };

  const addFromDraft = () => {
    // One field, many names: "패딩턴, 주디" adds both.
    const names = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (names.length === 0) return;
    let next = [...cast];
    for (const name of names) {
      if (next.some((c) => c.name === name)) continue;
      next = [...next, makeCharacter(name, next)];
    }
    commit(next);
    setDraft("");
  };

  const rename = (id: string, name: string) =>
    onChange(cast.map((c) => (c.id === id ? { ...c, name } : c)));

  const recolor = (id: string, color: string) =>
    commit(cast.map((c) => (c.id === id ? { ...c, color } : c)));

  const remove = (id: string) => commit(cast.filter((c) => c.id !== id));

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <label htmlFor="cast-input" className="text-sm font-medium text-foreground">
          등장인물
        </label>
        <span className="text-xs text-muted-foreground font-normal">
          {cast.length > 0 ? `${cast.length}명` : "이름을 입력하고 Enter"}
        </span>
      </div>

      <div className="flex gap-2">
        <Input
          id="cast-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFromDraft();
            }
          }}
          placeholder="예: 패딩턴 (쉼표로 여러 명 한 번에)"
          aria-describedby="cast-help"
        />
        <Button type="button" variant="outline" onClick={addFromDraft} disabled={!draft.trim()}>
          <Plus className="w-4 h-4 mr-1" /> 추가
        </Button>
      </div>
      <p id="cast-help" className="sr-only">
        이름을 입력하고 Enter를 누르면 등장인물이 추가됩니다. 각 인물의 색은 칩을 눌러 바꿀 수 있습니다.
      </p>

      {cast.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mt-2.5">
          {cast.map((c) => (
            <li key={c.id}>
              <div
                className="group inline-flex items-center gap-1 rounded-full border border-border bg-card pl-1 pr-1 py-0.5"
                style={{ borderColor: `${c.color}55` }}
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`${c.name} 색상 변경`}
                      title="색상 변경"
                    >
                      <PersonIcon color={c.color} size={16} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[232px] p-2" align="start">
                    <p className="text-xs text-muted-foreground mb-2">{c.name} 색상</p>
                    <div className="grid grid-cols-8 gap-1">
                      {CHARACTER_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => recolor(c.id, color)}
                          aria-label={color}
                          className={`h-6 w-6 rounded-md border transition-transform hover:scale-110 ${
                            c.color === color ? "ring-2 ring-primary ring-offset-1" : "border-border"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <input
                  value={c.name}
                  onChange={(e) => rename(c.id, e.target.value)}
                  onFocus={() => onBeforeChange?.()}
                  aria-label={`${c.name} 이름`}
                  className="bg-transparent text-xs font-medium outline-none"
                  style={{ color: readableTextColor(c.color), width: `${nameWidthCh(c.name)}ch` }}
                />
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  aria-label={`${c.name} 삭제`}
                  className="rounded-full p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CastEditor;
