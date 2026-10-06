// Countries present in the sample university dataset (supabase/seed.sql and
// migration_005), used for autocomplete suggestions and for the flag icon
// next to country names throughout the app (see components/flag.tsx).
export const COUNTRY_OPTIONS = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "New Zealand",
  "Ireland",
  "Germany",
  "Netherlands",
  "Switzerland",
  "Sweden",
  "Denmark",
  "Norway",
  "Finland",
  "France",
  "Belgium",
  "Austria",
  "Italy",
  "Spain",
  "Singapore",
  "Hong Kong",
  "Japan",
  "South Korea",
  "China",
  "Malaysia",
  "India",
  "United Arab Emirates",
] as const;

// ISO 3166-1 alpha-2 codes, used with the `flag-icons` CSS package.
const COUNTRY_CODES: Record<string, string> = {
  "United States": "us",
  "United Kingdom": "gb",
  Canada: "ca",
  Australia: "au",
  "New Zealand": "nz",
  Ireland: "ie",
  Germany: "de",
  Netherlands: "nl",
  Switzerland: "ch",
  Sweden: "se",
  Denmark: "dk",
  Norway: "no",
  Finland: "fi",
  France: "fr",
  Belgium: "be",
  Austria: "at",
  Italy: "it",
  Spain: "es",
  Singapore: "sg",
  "Hong Kong": "hk",
  Japan: "jp",
  "South Korea": "kr",
  China: "cn",
  Malaysia: "my",
  India: "in",
  "United Arab Emirates": "ae",
};

export function countryCode(country: string): string | null {
  return COUNTRY_CODES[country.trim()] ?? null;
}
