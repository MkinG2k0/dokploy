const KOPEK_PER_RUB = 100;

const intlLocale = (locale: string): string =>
  locale === "ru" ? "ru-RU" : locale;

/** Числовая часть суммы в ₽ для подстановок вроде «{price} ₽». */
export const formatRublesAmountFromKopek = (
  kopek: number,
  locale: string,
): string => {
  const rub = kopek / KOPEK_PER_RUB;
  const hasFraction = kopek % KOPEK_PER_RUB !== 0;
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rub);
};

/** Отображение цены с символом ₽ (как на карточках тарифов). */
export const formatRubCurrencyFromKopek = (
  kopek: number,
  locale: string,
): string => `${formatRublesAmountFromKopek(kopek, locale)}₽`;
