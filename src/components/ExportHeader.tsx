import React from "react";
import PersonIcon from "@/components/PersonIcon";
import { readableTextColor } from "@/lib/utils";
import type { Character } from "@/types/blocking";

interface ExportHeaderProps {
  title: string;
  sectionLabel: string;
  cast: Character[];
}

/**
 * Hidden on screen, revealed by the export cloner. Printed pages used to arrive
 * with no project title and no colour legend, so a handout was unreadable
 * without the person who made it standing next to you.
 */
const ExportHeader: React.FC<ExportHeaderProps> = ({ title, sectionLabel, cast }) => (
  <div data-export-only style={{ display: "none" }} className="mb-2 pb-2 border-b border-border">
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm font-bold text-foreground">{title || "제목 없는 동선"}</span>
      <span className="text-xs font-semibold text-muted-foreground">{sectionLabel}</span>
    </div>
    {cast.length > 0 && (
      <div className="flex flex-wrap gap-x-2.5 gap-y-1 mt-1.5">
        {cast.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1 text-[10px] font-medium">
            <PersonIcon color={c.color} size={11} />
            <span style={{ color: readableTextColor(c.color) }}>{c.name}</span>
          </span>
        ))}
      </div>
    )}
  </div>
);

export default ExportHeader;
