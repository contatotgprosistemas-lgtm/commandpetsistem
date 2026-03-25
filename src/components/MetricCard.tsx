import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
}

export function MetricCard({ title, value, change, changeType = "neutral", icon }: MetricCardProps) {
  const changeColor = changeType === "positive" ? "text-success" : changeType === "negative" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-border/60 hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center text-primary">
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
