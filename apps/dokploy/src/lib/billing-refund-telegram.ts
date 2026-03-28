/** Полная ссылка на Telegram из NEXT_PUBLIC_BILLING_REFUND_TELEGRAM, напр. https://t.me/double_cumboy */
const telegramHrefRaw = process.env.NEXT_PUBLIC_BILLING_REFUND_TELEGRAM?.trim();

export const getBillingRefundTelegramHref = (): string | null =>
	telegramHrefRaw && telegramHrefRaw.length > 0 ? telegramHrefRaw : null;

/** Для подписи в UI: @username из t.me/…, иначе пусто */
export const getBillingRefundTelegramHandle = (): string => {
	if (!telegramHrefRaw) return "";
	const m = telegramHrefRaw.match(/t\.me\/([^/?#]+)/i);
	return m?.[1] ? `@${m[1]}` : "";
};
