import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  accent?: "blue" | "emerald" | "violet" | "amber";
  filled?: boolean;
}

const accentStyles: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  blue: { bg: "bg-sky-500", text: "text-white", border: "border-l-sky-500", gradient: "from-sky-500 via-sky-600 to-blue-700" },
  emerald: { bg: "bg-emerald-500", text: "text-white", border: "border-l-emerald-500", gradient: "from-emerald-500 via-emerald-600 to-teal-700" },
  violet: { bg: "bg-violet-500", text: "text-white", border: "border-l-violet-500", gradient: "from-violet-500 via-purple-600 to-fuchsia-700" },
  amber: { bg: "bg-amber-500", text: "text-white", border: "border-l-amber-500", gradient: "from-amber-500 via-orange-500 to-orange-700" },
};

export function MetricCard({ title, value, change, changeType = "neutral", icon, accent, filled }: MetricCardProps) {
  const changeColor = changeType === "positive" ? "text-success" : changeType === "negative" ? "text-destructive" : "text-muted-foreground";
  const a = accent ? accentStyles[accent] : null;

  if (filled && a) {
    return (
      <div className={cn(
        "group relative overflow-hidden rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-default",
        "text-white ring-1 ring-white/10"
      )} style={{ backgroundImage: `linear-gradient(135deg, var(--mc-from), var(--mc-via), var(--mc-to))`, ...gradientVars(accent!) }}>
        <div className="relative flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-white/90 uppercase tracking-widest">{title}</span>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/25 text-white backdrop-blur-sm ring-1 ring-white/30 shadow-md">
            {icon}
          </div>
        </div>
        <div className="relative font-mono-tabular text-3xl font-bold tracking-tight drop-shadow-sm">{value}</div>
        {change && (
          <p className="relative text-xs mt-2 font-medium text-white/85">{change}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "group bg-card rounded-2xl p-5 shadow-card border border-border/60 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300",
      a && `border-l-4 ${a.border}`
    )}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{title}</span>
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform",
          a ? `${a.bg} ${a.text}` : "bg-primary text-primary-foreground"
        )}>
          {icon}
        </div>
      </div>
      <div className="font-mono-tabular text-3xl font-bold text-foreground tracking-tight">{value}</div>
      {change && (
        <p className={`text-xs mt-2 font-medium ${changeColor}`}>{change}</p>
      )}
    </div>
  );
}
