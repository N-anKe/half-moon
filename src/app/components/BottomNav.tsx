import { BarChart3, CalendarHeart, UserRound } from "lucide-react";
import type { TabKey } from "../App";
import { cn } from "./ui/utils";

const tabs: Array<{ key: TabKey; label: string; icon: typeof CalendarHeart }> = [
  { key: "home", label: "今天", icon: CalendarHeart },
  { key: "insights", label: "分析", icon: BarChart3 },
  { key: "profile", label: "我的", icon: UserRound }
];

interface BottomNavProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="底部导航"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] px-6 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:bottom-8 sm:px-6 sm:pb-0"
    >
      <div className="liquid-glass-nav grid grid-cols-3 p-2">
        {tabs.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;

          return (
            <button
              key={key}
              type="button"
              aria-label={label}
              onClick={() => onChange(key)}
              className={cn(
                "relative z-10 flex h-12 items-center justify-center gap-1.5 rounded-[24px] text-[13px] font-medium transition-all duration-300",
                active
                  ? "bg-[#1D1D1F]/95 text-white shadow-[0_12px_28px_rgba(29,29,31,0.24)]"
                  : "text-gray-500 hover:bg-white/35 hover:text-gray-700"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
