// Fixed "en-US" locale so the server and the browser format numbers the
// same way (a mismatch would cause a React hydration warning).
//
// One shared formatter: toLocaleString("en-US") builds a new one on every
// call, which added up on pages with many cards (docs/PERFORMANCE.md).
export const NUMBER_FORMAT = new Intl.NumberFormat("en-US");

export function usd(amount: number): string {
  return `$${NUMBER_FORMAT.format(Math.round(amount))}`;
}
