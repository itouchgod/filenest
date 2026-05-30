import { Grid2x2, LayoutGrid, List } from "lucide-react";
import type { DisplayLayout } from "../types/folder";

type LayoutSwitcherProps = {
  value: DisplayLayout;
  onChange: (layout: DisplayLayout) => void;
};

const layouts: Array<{ value: DisplayLayout; label: string; icon: typeof List }> =
  [
    { value: "grid", label: "Grid", icon: LayoutGrid },
    { value: "list", label: "List", icon: List },
    { value: "compact", label: "Compact", icon: Grid2x2 }
  ];

export default function LayoutSwitcher({
  value,
  onChange
}: LayoutSwitcherProps) {
  return (
    <div
      aria-label="Layout"
      className="layout-switcher"
      role="group"
    >
      {layouts.map((layout) => {
        const Icon = layout.icon;
        const isActive = value === layout.value;

        return (
          <button
            aria-label={layout.label}
            aria-pressed={isActive}
            className={isActive ? "active" : ""}
            key={layout.value}
            title={layout.label}
            type="button"
            onClick={() => onChange(layout.value)}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
