import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/utils/api";

const SUBSCRIPTION_STATUS_ACTIVE = "active";

const muted = "text-sm text-muted-foreground";

type SubscriptionRow = NonNullable<
  RouterOutputs["user"]["allUsers"][number]["user"]["subscription"]
>;

interface PlatformUserSubscriptionCellProps {
  subscription: SubscriptionRow | null | undefined;
}

export const PlatformUserSubscriptionCell = ({
  subscription,
}: PlatformUserSubscriptionCellProps) => {
  const t = useTranslations("settingsUsers");

  if (!subscription) {
    return (
      <TableCell className="min-w-56 align-top">
        <span className={muted}>{t("subscriptionNone")}</span>
      </TableCell>
    );
  }

  const isActive = subscription.status === SUBSCRIPTION_STATUS_ACTIVE;

  return (
    <TableCell className="min-w-56 align-top">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">{subscription.plan}</Badge>
          <Badge variant={isActive ? "secondary" : "outline"}>
            {isActive
              ? t("subscriptionStatusActive")
              : t("subscriptionStatusInactive")}
          </Badge>

          {subscription.cancelAtPeriodEnd ? (
            <Badge variant="outline">
              {t("subscriptionCancelAtPeriodEnd")}
            </Badge>
          ) : null}
          <Badge variant="outline">
            {subscription.autoRenew
              ? t("subscriptionAutoRenewOn")
              : t("subscriptionAutoRenewOff")}
          </Badge>
        </div>
        {subscription.currentPeriodEnd ? (
          <span className={cn(muted, "whitespace-nowrap")}>
            {format(new Date(subscription.currentPeriodEnd), "PPp")}
          </span>
        ) : null}
      </div>
    </TableCell>
  );
};
