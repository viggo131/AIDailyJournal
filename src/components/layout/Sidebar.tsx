import { Screen } from "../../lib/types";

interface NavItem {
  screen: Screen;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { screen: "journal",   label: "Today",      icon: "✦" },
  { screen: "dashboard", label: "Chronicle",  icon: "◈" },
  { screen: "history",   label: "History",    icon: "≡" },
  { screen: "settings",  label: "Settings",   icon: "⚙" },
];

interface SidebarProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export function Sidebar({ activeScreen, onNavigate }: SidebarProps) {
  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-full bg-surface border-r border-border select-none">
      {/* Logo / App name */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <img src="/logo.png" alt="" className="w-9 h-9 rounded-lg" />
        <h1 className="font-display text-accent text-lg font-semibold leading-tight">
          The Daily<br />Ledger
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ screen, label, icon }) => {
          const active = activeScreen === screen;
          return (
            <button
              key={screen}
              onClick={() => onNavigate(screen)}
              className={[
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-150 text-left",
                active
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-text-soft hover:text-text hover:bg-surface-hover",
              ].join(" ")}
            >
              <span className="text-base w-4 text-center">{icon}</span>
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4">
        <p className="text-xs text-muted">All data stored locally.</p>
      </div>
    </aside>
  );
}
