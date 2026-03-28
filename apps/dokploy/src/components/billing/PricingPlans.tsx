import { useMemo, useState } from "react";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
import { api } from "@/utils/api";

import {
	isPaidPlanKey,
	planTierRank,
	subscriptionHasPaidEntitlement,
} from "./billing-display";
import { SubscriptionCheckoutModal } from "./SubscriptionCheckoutModal";

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

	const [paidCheckoutPlan, setPaidCheckoutPlan] = useState<
		"pro" | "agency" | null
	>(null);

	const orderedKeys = useMemo(() => {
		return plans ? (Object.keys(plans) as Array<keyof typeof plans>) : [];
	}, [plans]);

	const handleSelectPlan = async (planKey: "free" | "pro" | "agency") => {
		if (planKey === "free") {
			try {
				const { paymentUrl } = await createCheckout({ plan: planKey });
				if (paymentUrl) {
					window.location.href = paymentUrl;
				}
			} catch {
				toast.error(t("checkoutStartError"));
			}
			return;
		}
		setPaidCheckoutPlan(planKey);
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

	const paidModalPlan = paidCheckoutPlan
		? plans[paidCheckoutPlan]
		: undefined;

	return (
		<TooltipProvider>
			{paidCheckoutPlan && paidModalPlan ? (
				<SubscriptionCheckoutModal
					plan={paidCheckoutPlan}
					isOpen
					planDisplayName={paidModalPlan.name}
					priceMonthly={paidModalPlan.priceMonthly}
					onClose={() => setPaidCheckoutPlan(null)}
				/>
			) : null}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{orderedKeys.map((key) => {
					const plan = plans[key];
					const isCurrent = isCurrentPlan(subscription, key);
					const isPaidActive =
						subscription?.status === "active" &&
						isPaidPlanKey(subscription.plan) &&
						subscription.plan === key;

					const isDowngrade = Boolean(
						paidSubscriptionOpen &&
							subscription &&
							isPaidPlanKey(subscription.plan) &&
							planTierRank(key) < planTierRank(subscription.plan),
					);

					const isButtonDisabled =
						isCheckoutLoading || isCurrent || isDowngrade;

					const buttonLabel = (() => {
						if (isCurrent) return t("currentPlan");
						if (isDowngrade) return t("downgradeNotAvailable");
						return t("selectPlan");
					})();

					const planButton = (
						<Button
							className={planCardButtonClassName}
							disabled={isButtonDisabled}
							isLoading={isCheckoutLoading}
							onClick={() => handleSelectPlan(key)}
						>
							{buttonLabel}
						</Button>
					);

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
								{isDowngrade ? (
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="mt-auto w-full">{planButton}</span>
										</TooltipTrigger>
										<TooltipContent className="max-w-xs whitespace-pre-line text-center">
											{t("downgradeBlockedTooltip")}
										</TooltipContent>
									</Tooltip>
								) : (
									planButton
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</TooltipProvider>
	);
};

