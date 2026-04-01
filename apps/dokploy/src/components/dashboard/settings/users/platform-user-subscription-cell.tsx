import { useCallback, useState } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { AdminEditUserSubscriptionDialog } from "@/components/dashboard/settings/users/admin-edit-user-subscription-dialog";
import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/utils/api";

const SUBSCRIPTION_STATUS_ACTIVE = "active";

type SubscriptionRow = NonNullable<
  RouterOutputs["user"]["allUsers"][number]["user"]["subscription"]
>;

interface PlatformUserSubscriptionCellProps {
  targetUserId: string;
  userEmail: string;
  subscription: SubscriptionRow | null | undefined;
}

export const PlatformUserSubscriptionCell = ({
  targetUserId,
  userEmail,
  subscription,
}: PlatformUserSubscriptionCellProps) => {
  const t = useTranslations("settingsUsers");
  const [dialogOpen, setDialogOpen] = useState(false);
  const subscriptionCellClass = "min-w-56 align-top p-4";
  const mutedTextClass = "text-sm text-muted-foreground";
  const planTriggerClass = cn(
    "inline-flex cursor-pointer rounded-md border-0 bg-transparent p-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  );
  const noneTriggerClass = cn(
    mutedTextClass,
    "cursor-pointer text-left underline-offset-2 hover:underline",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
  );

  const handleOpenDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const isActive = subscription?.status === SUBSCRIPTION_STATUS_ACTIVE;

  return (
    <TableCell className={subscriptionCellClass}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          {subscription ? (
            <>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className={planTriggerClass}
                  title={t("adminSubscriptionClickToEdit")}
                  onClick={handleOpenDialog}
                >
                  <Badge variant="outline">{subscription.plan}</Badge>
                </button>
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
                <span className={cn(mutedTextClass, "whitespace-nowrap")}>
                  {format(new Date(subscription.currentPeriodEnd), "PPp")}
                </span>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              className={noneTriggerClass}
              title={t("adminSubscriptionClickToEdit")}
              onClick={handleOpenDialog}
            >
              {t("subscriptionNone")}
            </button>
          )}
        </div>
        <AdminEditUserSubscriptionDialog
          targetUserId={targetUserId}
          userEmail={userEmail}
          subscription={subscription}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    </TableCell>
  );
};
