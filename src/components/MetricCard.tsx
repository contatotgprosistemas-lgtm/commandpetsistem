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
  blue: { bg: "bg-sky-500/10", text: "text-sky-600", border: "border-t-sky-500", gradient: "from-sky-500 to-blue-600" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-t-emerald-500", gradient: "from-emerald-500 to-teal-600" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-t-violet-500", gradient: "from-violet-500 to-fuchsia-600" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-t-amber-500", gradient: "from-amber-500 to-orange-600" },
};

export function MetricCard({ title, value, change, changeType = "neutral", icon, accent, filled }: MetricCardProps) {
  const changeColor = changeType === "positive" ? "text-success" : changeType === "negative" ? "text-destructive" : "text-muted-foreground";
  const a = accent ? accentStyles[accent] : null;

  if (filled && a) {
    return (
      <div className={cn(
        "relative overflow-hidden rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200",
        "bg-gradient-to-br text-white", a.gradient
      )}>
        <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-white/80 uppercase tracking-wider">{title}</span>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-white/20 text-white">
            {icon}
          </div>
        </div>
        <div className="relative font-mono-tabular text-2xl font-semibold tracking-tight">{value}</div>
        {change && (
          <p className="relative text-xs mt-1.5 font-medium text-white/80">{change}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-card rounded-xl p-5 shadow-card border border-border/60 hover:shadow-card-hover transition-all duration-200",
      a && `border-t-2 ${a.border}`
    )}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center",
          a ? `${a.bg} ${a.text}` : "bg-primary/8 text-primary"
        )}>
          {icon}
        </div>
      </div>
      <div className="font-mono-tabular text-2xl font-semibold text-foreground tracking-tight">{value}</div>
      {change && (
        <p className={`text-xs mt-1.5 font-medium ${changeColor}`}>{change}</p>
      )}
    </div>
  );
}
