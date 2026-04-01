import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { PlatformMembershipRow } from "./platform-membership-table-row";
import {
  computePlatformUsersStats,
  type PlatformUsersStats,
} from "./platform-users-stats";

const statsGridClass =
  "mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6";

const statCardClass =
  "flex flex-col gap-1 rounded-lg border border-border bg-card p-4";

interface StatItemProps {
  label: string;
  value: number;
  emphasize?: boolean;
  className?: string;
}

const StatItem = ({ label, value, emphasize, className }: StatItemProps) => (
  <div className={cn(statCardClass, className)}>
    <span className="text-xs text-muted-foreground">{label}</span>
    <span
      className={cn(
        "text-2xl font-semibold tabular-nums tracking-tight",
        emphasize && value > 0 && "text-destructive",
      )}
    >
      {value}
    </span>
  </div>
);

const STATS_CONFIG: {
  key: keyof PlatformUsersStats;
  labelKey: string;
  emphasize?: boolean;
}[] = [
  { key: "totalMemberships", labelKey: "platformStatMemberships" },
  { key: "uniqueUsers", labelKey: "platformStatUniqueUsers" },
  { key: "uniqueOrganizations", labelKey: "platformStatOrganizations" },
  {
    key: "usersWithActiveSubscription",
    labelKey: "platformStatActiveSubscriptions",
  },
  { key: "usersWithTwoFactor", labelKey: "platformStatTwoFactor" },
  { key: "usersBanned", labelKey: "platformStatBanned", emphasize: true },
];

interface PlatformUsersStatsSummaryProps {
  data: PlatformMembershipRow[];
  className?: string;
}

export const PlatformUsersStatsSummary = ({
  data,
  className,
}: PlatformUsersStatsSummaryProps) => {
  const t = useTranslations("settingsUsers");
  const stats = useMemo(() => computePlatformUsersStats(data), [data]);

  return (
    <div className={cn(statsGridClass, className)} role="region">
      {STATS_CONFIG.map(({ key, labelKey, emphasize }) => (
        <StatItem
          key={key}
          label={t(labelKey)}
          value={stats[key]}
          emphasize={emphasize}
        />
      ))}
    </div>
  );
};
