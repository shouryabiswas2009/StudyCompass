// Countries present in the sample university dataset (supabase/seed.sql),
// used for autocomplete suggestions and for the flag icon next to country
// names throughout the app (see components/flag.tsx).
export const COUNTRY_OPTIONS = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Switzerland",
  "Singapore",
  "Germany",
  "Netherlands",
  "New Zealand",
  "Ireland",
  "Sweden",
] as const;

// ISO 3166-1 alpha-2 codes, used with the `flag-icons` CSS package.
const COUNTRY_CODES: Record<string, string> = {
  "United States": "us",
  "United Kingdom": "gb",
  Canada: "ca",
  Australia: "au",
  Switzerland: "ch",
  Singapore: "sg",
  Germany: "de",
  Netherlands: "nl",
  "New Zealand": "nz",
  Ireland: "ie",
  Sweden: "se",
  India: "in",
};

export function countryCode(country: string): string | null {
  return COUNTRY_CODES[country.trim()] ?? null;
}
