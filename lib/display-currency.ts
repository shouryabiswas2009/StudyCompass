import { RATES_DATE, USD_PER_UNIT } from "@/lib/exchange-rates";

// The student's "show amounts also in" currency (profiles.display_currency,
// migration_016). Every figure is still stored and compared in US dollars;
// this only adds an approximate conversion next to it, at the same dated
// European Central Bank rates used for curated tuition (lib/exchange-rates.ts).

export const DEFAULT_DISPLAY_CURRENCY = "USD";

// Every currency we have an official rate for, US dollar first.
export const DISPLAY_CURRENCIES: string[] = [
  "USD",
  ...Object.keys(USD_PER_UNIT).filter((c) => c !== "USD").sort(),
];

export function isDisplayCurrency(code: string): boolean {
  return DISPLAY_CURRENCIES.includes(code);
}

// "Indian Rupee (INR)". Falls back to the code if the browser has no name.
export function currencyName(code: string): string {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "currency" }).of(code);
    return name && name !== code ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

// Rounded to three significant figures: the rate is a single day's, so more
// digits would claim a precision the conversion doesn't have.
export function roundApprox(amount: number): number {
  if (amount === 0) return 0;
  const step = 10 ** Math.max(0, Math.floor(Math.log10(Math.abs(amount))) - 2);
  return Math.round(amount / step) * step;
}

// US dollars → the display currency, or null when there's nothing to add
// (the student shows dollars, or we have no rate for the currency).
export function fromUsd(usd: number | null | undefined, currency: string | null | undefined): number | null {
  if (usd === null || usd === undefined || !currency || currency === "USD") return null;
  const rate = USD_PER_UNIT[currency];
  return rate === undefined ? null : roundApprox(usd / rate);
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

// "≈ ₹2,800,000", or null (see fromUsd).
export function approxInCurrency(usd: number | null | undefined, currency: string | null | undefined): string | null {
  const amount = fromUsd(usd, currency);
  return amount === null ? null : `≈ ${formatCurrency(amount, currency!)}`;
}

export const APPROX_NOTE = `approximate, at the European Central Bank rate of ${RATES_DATE}`;
