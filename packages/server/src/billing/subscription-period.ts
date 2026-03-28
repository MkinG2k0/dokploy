import {
  addDays,
  addHours,
  addMinutes,
  subHours,
  subMinutes,
} from "date-fns";

import { PERIOD_DAYS } from "./plans";

/**
 * Длительность «периода» в тестовом режиме (минуты).
 * Включается через BILLING_SUBSCRIPTION_PERIOD_TEST=true|1.
 */
export const PERIOD_MINUTES_TEST = 1 as const;

const envFlag = (): boolean => {
  const v = process.env.BILLING_SUBSCRIPTION_PERIOD_TEST;
  return v === "true" || v === "1";
};

/** Тест: период подписки 1 минута, крон рекуррента — каждую минуту (см. charge-subscriptions). */
export const isSubscriptionPeriodTestMode = (): boolean => envFlag();

/**
 * Конец текущего платёжного периода от заданной даты.
 * В проде: {@link PERIOD_DAYS} календарных дней через addDays (как раньше).
 * В тесте: {@link PERIOD_MINUTES_TEST} минут через addMinutes.
 */
export const addSubscriptionPeriodEnd = (from: Date): Date => {
  if (isSubscriptionPeriodTestMode()) {
    return addMinutes(from, PERIOD_MINUTES_TEST);
  }
  return addDays(from, PERIOD_DAYS);
};

/** Окно «за сколько до конца периода» начинать рекуррент (тест, минуты). */
export const RENEWAL_LEAD_MINUTES_TEST = 1 as const;

/** Не дублировать pending charge чаще, чем раз в N минут (тест). */
export const PENDING_CHARGE_COOLDOWN_MINUTES_TEST = 1 as const;

const RENEWAL_LEAD_HOURS_PROD = 24;
const PENDING_CHARGE_COOLDOWN_HOURS_PROD = 24;

export const renewalHorizonFromNow = (now: Date): Date => {
  if (isSubscriptionPeriodTestMode()) {
    return addMinutes(now, RENEWAL_LEAD_MINUTES_TEST);
  }
  return addHours(now, RENEWAL_LEAD_HOURS_PROD);
};

export const pendingChargeCooldownSince = (now: Date): Date => {
  if (isSubscriptionPeriodTestMode()) {
    return subMinutes(now, PENDING_CHARGE_COOLDOWN_MINUTES_TEST);
  }
  return subHours(now, PENDING_CHARGE_COOLDOWN_HOURS_PROD);
};
