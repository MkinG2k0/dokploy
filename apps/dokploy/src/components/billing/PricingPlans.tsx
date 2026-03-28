import { useMemo } from "react";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";

import {
	isPaidPlanKey,
	subscriptionHasPaidEntitlement,
} from "./billing-display";

const cardClassName =
	"bg-background flex flex-col rounded-xl border border-border shadow-sm";

const planCardButtonClassName =
	"mt-auto w-full min-w-0 whitespace-normal text-center leading-snug min-h-9 h-auto py-2.5";

/** Текущий отображаемый план: платный тариф только при active/past_due. */
const isCurrentPlan = (
	subscription: { plan: string; status: string } | null | undefined,
	key: "free" | "pro" | "agency",
): boolean => {
	if (!subscription) {
		return key === "free";
	}

	if (subscriptionHasPaidEntitlement(subscription)) {
		return subscription.plan === key;
	}

	return key === "free";
};

export const PricingPlans = () => {
	const t = useTranslations("billing");
	const { data: plans, isPending: isPlansLoading, error: plansError } =
		api.billing.getPlans.useQuery();
	const { data: subscription } = api.billing.getSubscription.useQuery();
	const { mutateAsync: createCheckout, isPending: isCheckoutLoading } =
		api.billing.createCheckout.useMutation();

	const orderedKeys = useMemo(() => {
		return plans ? (Object.keys(plans) as Array<keyof typeof plans>) : [];
	}, [plans]);

	const handleSelectPlan = async (plan: "free" | "pro" | "agency") => {
		const {paymentUrl} = await createCheckout({ plan });

		window.location.href = paymentUrl;

	}; 

	if (isPlansLoading) {
		return (
			<div className="text-sm text-muted-foreground">{t("loadingPlans")}</div>
		);
	}

	if (plansError || !plans) {
		return (
			<div className="text-sm text-muted-foreground">
				{t("loadingPlansError")}
			</div>
		);
	}

	const paidSubscriptionOpen = subscriptionHasPaidEntitlement(subscription);

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
			{orderedKeys.map((key) => {
				const plan = plans[key];
				const isCurrent = isCurrentPlan(subscription, key);
				const isPaidActive =
					subscription?.status === "active" &&
					isPaidPlanKey(subscription.plan) &&
					subscription.plan === key;

				const isButtonDisabled =
					isCheckoutLoading ||
					isCurrent ||
					(key === "free" && paidSubscriptionOpen);

				const buttonLabel = (() => {
					if (isCurrent) return t("currentPlan");
					if (key === "free" && paidSubscriptionOpen) {
						return t("cancelSubscriptionFirst");
					}
					return t("selectPlan");
				})();

				return (
					<Card
						key={key}
						className={cn(cardClassName, isCurrent && "ring-1 ring-primary")}
					>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle className="text-base">{plan.name}</CardTitle>
							{isPaidActive ? <Badge>{t("active")}</Badge> : null}
							{isCurrent && !isPaidActive ? (
								<Badge variant="secondary">{t("current")}</Badge>
							) : null}
						</CardHeader>
						<CardContent className="flex flex-1 flex-col gap-4">
							<div className="text-3xl font-semibold">
								{plan.priceMonthly}₽
								<span className="text-sm font-normal text-muted-foreground">
									{" "}
									{t("perMonth")}
								</span>
							</div>
							<ul className="text-sm text-muted-foreground space-y-1">
								{plan.features.description.map((feature) => (
									<li key={feature}>{feature}</li>
								))}
							</ul>
							<Button
								className={planCardButtonClassName}
								disabled={isButtonDisabled}
								isLoading={isCheckoutLoading}
								onClick={() => handleSelectPlan(key)}
							>
								{buttonLabel}
							</Button>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
};

