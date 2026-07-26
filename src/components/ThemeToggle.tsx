import React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

const ORDER = ["light", "dark", "system"] as const;
const META: Record<(typeof ORDER)[number], { icon: React.ElementType; label: string }> = {
  light: { icon: Sun, label: "밝게" },
  dark: { icon: Moon, label: "어둡게" },
  system: { icon: Monitor, label: "시스템 설정" },
};

/**
 * The app already shipped a full dark palette but no way to reach it.
 * Rendered either as a standalone button or as a row inside a dropdown menu.
 */
const ThemeToggle: React.FC<{ asMenuItem?: boolean }> = ({ asMenuItem = false }) => {
  const { theme, setTheme } = useTheme();
  const current = (ORDER as readonly string[]).includes(theme ?? "") ? (theme as (typeof ORDER)[number]) : "system";
  const Icon = META[current].icon;
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  if (asMenuItem) {
    return (
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          setTheme(next);
        }}
      >
        <Icon className="w-4 h-4 mr-2" />
        <span className="flex-1">화면 테마</span>
        <span className="text-xs text-muted-foreground">{META[current].label}</span>
      </DropdownMenuItem>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(next)}
      aria-label={`화면 테마: ${META[current].label} — 눌러서 ${META[next].label}로`}
      title={`화면 테마: ${META[current].label}`}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
};

export default ThemeToggle;
