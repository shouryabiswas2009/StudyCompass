// Fixed "en-US" locale so the server and the browser format numbers the
// same way (a mismatch would cause a React hydration warning).
export function usd(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}
