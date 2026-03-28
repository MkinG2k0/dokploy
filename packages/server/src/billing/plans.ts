export type PlanName = "free" | "pro" | "agency";

export type PlanFeatures = {
  description: string[];
  availableServer: number;
};

export type Plan = {
  name: string;
  price: number;
  priceMonthly: number;
  features: PlanFeatures;
};

export const PLANS: Record<PlanName, Plan> = {
  free: {
    name: "Free",
    price: 0,
    priceMonthly: 0,
    features: {
      description: ["1 сервер", "Безлимит проектов", "SSL", "Git deploy"],
      availableServer: 1,
    },
  },
  pro: {
    name: "Pro",
    price: 39_900,
    priceMonthly: 399,
    features: {
      description: ["10 серверов", "Мониторинг", "Rollback", "Telegram алерты"],
      availableServer: 10,
    },
  },
  agency: {
    name: "Agency",
    price: 99_900,
    priceMonthly: 999,
    features: {
      description: ["50 серверов", "AI Deploy", "API", "SLA 99.9%"],
      availableServer: 50,
    },
  },
} as const;

/** Длительность периода в проде (дней). В тесте см. billing/subscription-period и BILLING_SUBSCRIPTION_PERIOD_TEST. */
export const PERIOD_DAYS = 30 as const;

export type PlanKey = keyof typeof PLANS;

const LOW_PRICE_PRO_KOPEK = 300 as const;
const LOW_PRICE_AGENCY_KOPEK = 500 as const;
const LOW_PRICE_PRO_MONTHLY_RUB = 3 as const;
const LOW_PRICE_AGENCY_MONTHLY_RUB = 5 as const;

/** Минимальные суммы для теста эквайринга Тинькофф (не включать в проде). */
export const isTinkoffLowPricePaymentEnabled = (): boolean =>
  process.env.TINKOFF_LOW_PRICE_PAYMENT_ENABLED === "true";

/** Цены в копейках и рублях/мес с учётом TINKOFF_LOW_PRICE_PAYMENT_ENABLED. */
export const getEffectivePlanPrices = (
  plan: PlanName,
): { price: number; priceMonthly: number } => {
  if (!isTinkoffLowPricePaymentEnabled()) {
    const p = PLANS[plan];
    return { price: p.price, priceMonthly: p.priceMonthly };
  }
  if (plan === "pro") {
    return {
      price: LOW_PRICE_PRO_KOPEK,
      priceMonthly: LOW_PRICE_PRO_MONTHLY_RUB,
    };
  }
  if (plan === "agency") {
    return {
      price: LOW_PRICE_AGENCY_KOPEK,
      priceMonthly: LOW_PRICE_AGENCY_MONTHLY_RUB,
    };
  }
  const p = PLANS[plan];
  return { price: p.price, priceMonthly: p.priceMonthly };
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
      priceMonthly: LOW_PRICE_PRO_MONTHLY_RUB,
    },
    agency: {
      ...PLANS.agency,
      price: LOW_PRICE_AGENCY_KOPEK,
      priceMonthly: LOW_PRICE_AGENCY_MONTHLY_RUB,
    },
  };
};
