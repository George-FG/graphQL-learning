export type Period = "today" | "24h" | "7d" | "30d" | "week" | "month" | "all";
export const PERIODS: { label: string; value: Period }[] = [
  { label: "Today",    value: "today" },
  { label: "Week",     value: "week" },
  { label: "Month",    value: "month" },
  { label: "All time", value: "all" },
];
