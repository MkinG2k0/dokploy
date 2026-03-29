type SubscriptionLike = {
	plan: string;
	status: string;
	cancelAtPeriodEnd: boolean;
} | null;

export const isPaidPlanKey = (plan: string): plan is "pro" | "agency" =>
	plan === "pro" || plan === "agency";

/** Порядок тарифов для сравнения (даунгрейд в UI запрещён). */
export const planTierRank = (key: "free" | "pro" | "agency"): number => {
	if (key === "agency") return 2;
	if (key === "pro") return 1;
	return 0;
};

/** Платный доступ: активна или просрочена оплата (не «ожидаем оплату чек-аута»). */
export const subscriptionHasPaidEntitlement = (
	subscription: { plan: string; status: string } | null | undefined,
): boolean =>
	Boolean(
		subscription &&
			isPaidPlanKey(subscription.plan) &&
			(subscription.status === "active" || subscription.status === "past_due"),
	);

export type SubscriptionUiStatus =
	| "freeTier"
	| "active"
	| "cancelScheduled"
	| "past_due"
	| "canceled";

export type SubscriptionStatusBadgeVariant =
	| "green"
	| "yellow"
	| "secondary"
	| "outline";

export const effectivePlanKey = (
	subscription: SubscriptionLike,
): "free" | "pro" | "agency" => {
	if (subscription?.plan === "pro") return "pro";
	if (subscription?.plan === "agency") return "agency";
	return "free";
};

export const subscriptionUiStatus = (
	subscription: SubscriptionLike,
): SubscriptionUiStatus => {
	if (!subscription) return "freeTier";
	if (subscription.status === "canceled") return "canceled";
	if (subscription.status === "past_due") return "past_due";
	if (
		subscription.status === "active" &&
		(subscription.plan === "pro" || subscription.plan === "agency")
	) {
		if (subscription.cancelAtPeriodEnd) return "cancelScheduled";
		return "active";
	}
	return "freeTier";
};

export const subscriptionStatusBadgeVariant = (
	ui: SubscriptionUiStatus,
): SubscriptionStatusBadgeVariant => {
	if (ui === "active") return "green";
	if (ui === "cancelScheduled") return "secondary";
	if (ui === "past_due") return "yellow";
	if (ui === "canceled") return "secondary";
	return "outline";
};

export type PaymentRowStatusBadgeVariant =
	| "yellow"
	| "green"
	| "destructive"
	| "secondary";

export const paymentStatusBadgeVariant = (
	status: string,
): PaymentRowStatusBadgeVariant => {
	if (status === "succeeded") return "green";
	if (status === "pending") return "yellow";
	if (status === "failed") return "destructive";
	return "secondary";
};

export const cancelButtonMode = (
	subscription: SubscriptionLike,
): "cancel" | "scheduled" | "disabled" => {
	if (
		!subscription ||
		subscription.plan === "free" ||
		(subscription.plan !== "pro" && subscription.plan !== "agency")
	) {
		return "disabled";
	}
	if (subscription.cancelAtPeriodEnd) return "scheduled";
	if (subscription.status === "active") return "cancel";
	return "disabled";
};
