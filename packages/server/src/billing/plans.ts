export type PlanName = "free" | "pro" | "agency";

export type PlanFeatures = {
	description: string[];
	availableServer: number;
};

export type Plan = {
	name: string;
	/** Сумма периода в копейках (как в payment.amount в БД). */
	price: number;
	features: PlanFeatures;
};

export const PLANS: Record<PlanName, Plan> = {
	free: {
		name: "Free",
		price: 0,
		features: {
			description: ["1 сервер", "Безлимит проектов", "SSL", "Git deploy"],
			availableServer: 1,
		},
	},
	pro: {
		name: "Pro",
		price: 399_00,
		features: {
			description: ["10 серверов", "Мониторинг", "Rollback", "Telegram алерты"],
			availableServer: 10,
		},
	},
	agency: {
		name: "Agency",
		price: 999_00,
		features: {
			description: ["50 серверов", "AI Deploy", "API", "SLA 99.9%"],
			availableServer: 50,
		},
	},
} as const;

/** Длительность периода в проде (дней). В тесте см. billing/subscription-period и BILLING_SUBSCRIPTION_PERIOD_TEST. */
export const PERIOD_DAYS = 30 as const;

export type PlanKey = keyof typeof PLANS;

/** Число слотов серверов по плану (единый источник с PLANS.*.features.availableServer). */
export const getServersQuantityByPlan = (planKey: PlanKey): number =>
	PLANS[planKey].features.availableServer;

const LOW_PRICE_PRO_KOPEK = 3_00 as const;
const LOW_PRICE_AGENCY_KOPEK = 5_00 as const;

/** Минимальные суммы для теста эквайринга Тинькофф (не включать в проде). */
export const isTinkoffLowPricePaymentEnabled = (): boolean =>
	process.env.TINKOFF_LOW_PRICE_PAYMENT_ENABLED === "true";

/** Эффективная цена периода в копейках с учётом TINKOFF_LOW_PRICE_PAYMENT_ENABLED. */
export const getEffectivePlanPrices = (plan: PlanName): { price: number } => {
	if (isTinkoffLowPricePaymentEnabled()) {
		if (plan === "pro") {
			return { price: LOW_PRICE_PRO_KOPEK };
		}
		if (plan === "agency") {
			return { price: LOW_PRICE_AGENCY_KOPEK };
		}
	}
	return PLANS[plan];
};

/** Каталог для UI и checkout — те же суммы, что уйдут в Init и в payment.amount. */
export const getPlansForDisplay = (): Record<PlanName, Plan> => {
	if (!isTinkoffLowPricePaymentEnabled()) {
		return PLANS;
	}
	return {
		...PLANS,
		pro: {
			...PLANS.pro,
			price: LOW_PRICE_PRO_KOPEK,
		},
		agency: {
			...PLANS.agency,
			price: LOW_PRICE_AGENCY_KOPEK,
		},
	};
};
