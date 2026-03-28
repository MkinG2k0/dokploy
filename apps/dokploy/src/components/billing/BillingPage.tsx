import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { BillingSubscriptionCard } from "@/components/billing/BillingSubscriptionCard";
import { PaymentHistorySection } from "@/components/billing/PaymentHistorySection";
import { PricingPlans } from "@/components/billing/PricingPlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/utils/api";

export const BillingPage = () => {
  const router = useRouter();
  const t = useTranslations("billing");
  const utils = api.useUtils();
  const paymentReturnToastShown = useRef(false);

  const { data: subscription } = api.billing.getSubscription.useQuery();
  const { mutateAsync: cancelSubscription, isPending: isCancelLoading } =
    api.billing.cancelSubscription.useMutation();
  const { mutateAsync: syncCheckoutStatus } =
    api.billing.syncCheckoutStatus.useMutation();

  useEffect(() => {
    return;
    if (!router.isReady) return;
    const status = router.query.status;
    if (status !== "success" && status !== "fail") return;

    const syncAndRefresh = async () => {
      if (status === "success") {
        await syncCheckoutStatus();
      }

      await Promise.all([
        utils.billing.getSubscription.invalidate(),
        utils.billing.getPayments.invalidate(),
      ]);
    };

    void syncAndRefresh();

    if (paymentReturnToastShown.current) return;
    paymentReturnToastShown.current = true;

    if (status === "success") {
      toast.success(t("paymentReturn.success"));
    } else {
      toast.error(t("paymentReturn.fail"));
    }

    const { status: _status, ...restQuery } = router.query;
    void router.replace(
      {
        pathname: router.pathname,
        query: restQuery,
      },
      undefined,
      { shallow: true },
    );
  }, [router.isReady, router.query.status, syncCheckoutStatus, t, utils]);

  const handleCancel = async () => {
    try {
      await cancelSubscription();
      await Promise.all([
        utils.billing.getSubscription.invalidate(),
        utils.billing.getPayments.invalidate(),
      ]);
      toast.success(t("cancelSuccess"));
    } catch {
      toast.error(t("cancelError"));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BillingSubscriptionCard
        subscription={subscription ?? null}
        isCancelLoading={isCancelLoading}
        onCancel={handleCancel}
      />

      <Card className="bg-background">
        <CardHeader>
          <CardTitle>{t("plansTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PricingPlans />
        </CardContent>
      </Card>

      <PaymentHistorySection />
    </div>
  );
};
