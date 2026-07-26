import React from "react";
import { ListOrdered } from "lucide-react";

export interface NavItem {
  key: string;
  label: string;
  /** Flat stage index this chip scrolls to and activates. */
  index: number;
  count?: number;
}

interface SectionNavProps {
  items: NavItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/**
 * With ten verses the only way to reach #8 was to scroll and hope. These chips
 * make the whole project navigable at a glance and mark where you are.
 */
const SectionNav: React.FC<SectionNavProps> = ({ items, activeIndex, onSelect }) => {
  if (items.length <= 1) return null;

  return (
    <nav
      className="sticky top-[var(--header-h,56px)] z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-1.5 bg-background/90 backdrop-blur border-b border-border/70"
      aria-label="구간 바로가기"
      data-export-hidden
    >
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <ListOrdered className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
        {items.map((item) => {
          const active = item.index === activeIndex;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.index)}
              aria-current={active ? "true" : undefined}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              {item.label}
              {item.count != null && <span className="ml-1 opacity-70">{item.count}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default SectionNav;
