import { usd } from "@/lib/format";
import type { University } from "@/lib/types";

// How tuition and living costs are shown everywhere (cards, details page,
// compare). Three honest cases:
//   unknown              → "Not available" (never $0 or a blank)
//   US dollars already   → "$58,000/yr"
//   converted from local → "≈ $13,225/yr", with a note saying it's an
//                           approximation, from what, and at which rate date
// "from" is added when the figure is the lowest of a published range.

type MoneyFields = Pick<University, "tuition" | "living_cost_per_year"> &
  Partial<
    Pick<
      University,
      | "tuition_local"
      | "tuition_currency"
      | "tuition_basis"
      | "tuition_year"
      | "living_cost_local"
      | "living_cost_currency"
      | "fx_rate_date"
    >
  >;

export type MoneyDisplay = { text: string; note: string | null; approximate: boolean };

// One formatter per currency, made once (creating one per call is slow).
const formatters = new Map<string, Intl.NumberFormat>();
const local = (amount: number, currency: string) => {
  if (!formatters.has(currency)) {
    formatters.set(currency, new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }));
  }
  return formatters.get(currency)!.format(amount);
};

function display(
  amountUsd: number | null,
  amountLocal: number | null | undefined,
  currency: string | null | undefined,
  fxDate: string | null | undefined,
  prefix = ""
): MoneyDisplay {
  if (amountUsd === null) {
    // A local amount with no official rate: show it as is, but don't invent
    // a dollar figure.
    if (amountLocal != null && currency) {
      return { text: `${prefix}${local(amountLocal, currency)}/yr`, note: "No official exchange rate for this currency, so it isn't converted to US dollars.", approximate: false };
    }
    return { text: "Not available", note: null, approximate: false };
  }
  if (!currency || currency === "USD" || amountLocal == null) {
    return { text: `${prefix}${usd(amountUsd)}/yr`, note: null, approximate: false };
  }
  return {
    text: `${prefix}≈ ${usd(amountUsd)}/yr`,
    note: `Approximate: ${local(amountLocal, currency)} converted at the European Central Bank rate${fxDate ? ` of ${fxDate}` : ""}.`,
    approximate: true,
  };
}

export function tuitionDisplay(u: MoneyFields): MoneyDisplay {
  const isFrom = /^lowest/i.test(u.tuition_basis ?? "");
  const result = display(u.tuition, u.tuition_local, u.tuition_currency, u.fx_rate_date, isFrom ? "from " : "");
  const basis = [u.tuition_basis, u.tuition_year].filter(Boolean).join(", ");
  if (basis) result.note = [result.note, `${basis}.`].filter(Boolean).join(" ");
  return result;
}

export function livingCostDisplay(u: MoneyFields): MoneyDisplay {
  return display(u.living_cost_per_year, u.living_cost_local, u.living_cost_currency, u.fx_rate_date, "about ");
}
