/** Наша БД и каталог планов — сумма в копейках; в Tinkoff Init уходит Amount в копейках (внутри payment.init рубли → rubToKopek). */
export const KOPEK_PER_RUB = 100 as const;

export const kopekToRub = (kopek: number): number => kopek / KOPEK_PER_RUB;
