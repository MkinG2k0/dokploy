import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { BillingSubscriptionCard } from "@/components/billing/BillingSubscriptionCard";
import { PaymentHistorySection } from "@/components/billing/PaymentHistorySection";
import { PricingPlans } from "@/components/billing/PricingPlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/utils/api";

export const BillingPage = () => {
  const t = useTranslations("billing");
  const utils = api.useUtils();

  const { data: subscription, refetch: refetchSubscription } =
    api.billing.getSubscription.useQuery();
  const { mutateAsync: cancelSubscription, isPending: isCancelLoading } =
    api.billing.cancelSubscription.useMutation();
  const { mutateAsync: deleteSubscription, isPending: isDeleteSubscriptionLoading } =
    api.billing.deleteSubscription.useMutation();

  const handleCancel = async () => {
    try {
      await cancelSubscription();
      await Promise.all([
        utils.billing.getSubscription.invalidate(),
        utils.billing.getPayments.invalidate(),
        refetchSubscription(),
      ]);
      toast.success(t("cancelSuccess"));
    } catch {
      toast.error(t("cancelError"));
    }
  };

  const handleDeleteSubscription = async () => {
    try {
      await deleteSubscription();
      await Promise.all([
        utils.billing.getSubscription.invalidate(),
        utils.billing.getPayments.invalidate(),
        refetchSubscription(),
      ]);
      toast.success(t("deleteSubscriptionSuccess"));
    } catch {
      toast.error(t("deleteSubscriptionError"));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BillingSubscriptionCard
        subscription={subscription ?? null}
        isCancelLoading={isCancelLoading}
        onCancel={handleCancel}
        isDeleteSubscriptionLoading={isDeleteSubscriptionLoading}
        onDeleteSubscription={handleDeleteSubscription}
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
