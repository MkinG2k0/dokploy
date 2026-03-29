import { useState } from "react";

import { format } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { ru as ruDateLocale } from "date-fns/locale/ru";
import { useLocale, useTranslations } from "next-intl";

import {
  cancelButtonMode,
  effectivePlanKey,
  subscriptionStatusBadgeVariant,
  subscriptionUiStatus,
} from "@/components/billing/billing-display";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SubscriptionRow = {
  plan: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
} | null;

const statItemClassName =
  "flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2";

const formatRenewalDate = (
  date: Date | null | undefined,
  localeCode: string,
): string | null => {
  if (!date) return null;
  const locale = localeCode === "ru" ? ruDateLocale : enUS;
  return format(new Date(date), "d MMMM yyyy", { locale });
};

interface BillingSubscriptionCardProps {
  subscription: SubscriptionRow;
  isCancelLoading: boolean;
  onCancel: () => void | Promise<void>;
  isDeleteSubscriptionLoading: boolean;
  onDeleteSubscription: () => void | Promise<void>;
}

export const BillingSubscriptionCard = ({
  subscription,
  isCancelLoading,
  onCancel,
  isDeleteSubscriptionLoading,
  onDeleteSubscription,
}: BillingSubscriptionCardProps) => {
  const t = useTranslations("billing");
  const locale = useLocale();
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const uiStatus = subscriptionUiStatus(subscription);
  const planKey = effectivePlanKey(subscription);
  const cancelMode = cancelButtonMode(subscription);
  const renewalFormatted = formatRenewalDate(
    subscription?.currentPeriodEnd ?? null,
    locale,
  );
  const showRenewal = Boolean(
    subscription &&
    (subscription.plan === "pro" || subscription.plan === "agency") &&
    subscription.status === "active" &&
    renewalFormatted,
  );

  const renewalColumnLabel =
    subscription?.cancelAtPeriodEnd && showRenewal
      ? t("accessUntil")
      : t("nextCharge");

  const cancelTooltip =
    cancelMode === "disabled"
      ? t("cancelDisabledNoPaid")
      : cancelMode === "scheduled"
        ? t("cancelScheduledHint")
        : undefined;

  const cancelLabel =
    cancelMode === "scheduled" ? t("cancelScheduled") : t("cancelSubscription");

  const cancelDisabled = cancelMode !== "cancel" || isCancelLoading;
  const showCancelTooltip = cancelDisabled && Boolean(cancelTooltip);

  const cancelConfirmDate = renewalFormatted ?? t("cancelConfirmDateUnknown");

  const handleOpenCancelDialog = () => {
    if (cancelMode === "cancel" && !isCancelLoading) {
      setIsCancelDialogOpen(true);
    }
  };

  const handleConfirmCancel = async () => {
    await onCancel();
    setIsCancelDialogOpen(false);
  };

  const handleConfirmCancelClick = () => {
    void handleConfirmCancel();
  };

  const handleConfirmDeleteSubscription = async () => {
    await onDeleteSubscription();
    setIsDeleteDialogOpen(false);
  };

  const handleOpenDeleteSubscriptionDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteSubscriptionClick = () => {
    void handleConfirmDeleteSubscription();
  };

  const showDeleteSubscriptionButton = Boolean(subscription);

  return (
    <Card className="bg-background">
      <CardHeader className="pb-2">
        <CardTitle>{t("subscriptionTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className={statItemClassName}>
            <span className="text-sm text-muted-foreground">
              {t("statusLabel")}
            </span>
            <Badge variant={subscriptionStatusBadgeVariant(uiStatus)}>
              {t(`subscriptionStatus.${uiStatus}`)}
            </Badge>
          </div>
          <div className={statItemClassName}>
            <span className="text-sm text-muted-foreground">
              {t("planLabel")}
            </span>
            <Badge variant={planKey === "free" ? "outline" : "green"}>
              {t(planKey)}
            </Badge>
          </div>
          <div className={cn(statItemClassName, "justify-between")}>
            <span className="text-sm text-muted-foreground">
              {renewalColumnLabel}
            </span>
            <span className="text-sm text-foreground">
              {showRenewal && renewalFormatted ? (
                renewalFormatted
              ) : (
                <span className="text-muted-foreground">
                  {t("nextChargeNotApplicable")}
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
          <AlertDialog
            open={isCancelDialogOpen}
            onOpenChange={setIsCancelDialogOpen}
          >
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "inline-flex w-full sm:w-auto",
                      cancelDisabled && "cursor-default",
                    )}
                  >
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={cancelDisabled}
                      isLoading={isCancelLoading}
                      onClick={handleOpenCancelDialog}
                    >
                      {cancelLabel}
                    </Button>
                  </span>
                </TooltipTrigger>
                {showCancelTooltip ? (
                  <TooltipContent side="top" className="max-w-xs">
                    <p>{cancelTooltip}</p>
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </TooltipProvider>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("cancelConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("cancelConfirmDescription", {
                    date: cancelConfirmDate,
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancelConfirmBack")}</AlertDialogCancel>
                <Button
                  disabled={isCancelLoading}
                  isLoading={isCancelLoading}
                  onClick={handleConfirmCancelClick}
                >
                  {t("cancelConfirmAction")}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {showDeleteSubscriptionButton ? (
            <AlertDialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
            >
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={isDeleteSubscriptionLoading}
                isLoading={isDeleteSubscriptionLoading}
                onClick={handleOpenDeleteSubscriptionDialog}
              >
                {t("deleteSubscriptionTemp")}
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("deleteSubscriptionDialogTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteSubscriptionDialogDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("deleteSubscriptionDialogBack")}
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    disabled={isDeleteSubscriptionLoading}
                    isLoading={isDeleteSubscriptionLoading}
                    onClick={handleConfirmDeleteSubscriptionClick}
                  >
                    {t("deleteSubscriptionDialogConfirm")}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
