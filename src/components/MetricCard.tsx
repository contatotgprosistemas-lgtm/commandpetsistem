import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  accent?: "blue" | "emerald" | "violet" | "amber";
}

const accentStyles: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-sky-500/10", text: "text-sky-600", border: "border-t-sky-500" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-t-emerald-500" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-t-violet-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-t-amber-500" },
};

export function MetricCard({ title, value, change, changeType = "neutral", icon, accent }: MetricCardProps) {
  const changeColor = changeType === "positive" ? "text-success" : changeType === "negative" ? "text-destructive" : "text-muted-foreground";
  const a = accent ? accentStyles[accent] : null;

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
