// One canonical name per country, used everywhere a country is stored,
// compared or shown: the profile form, the filters, matching and the flag
// icons. Students type countries freely ("UK", "USA", "Holland"), so every
// comparison goes through canonicalCountry() instead of comparing raw text.

// Canonical name → ISO 3166-1 alpha-2 code (for the `flag-icons` CSS).
const COUNTRY_CODES = {
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
  Taiwan: "tw",
  Malaysia: "my",
  India: "in",
  "United Arab Emirates": "ae",
} as const;

export type Country = keyof typeof COUNTRY_CODES;

// Suggestions for the profile and "add a university" forms.
export const COUNTRY_OPTIONS = Object.keys(COUNTRY_CODES) as Country[];

// Other names people use → the canonical name. Keys are lower-case.
const ALIASES: Record<string, Country> = {
  usa: "United States",
  us: "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  "united states of america": "United States",
  america: "United States",
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  "great britain": "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
  "northern ireland": "United Kingdom",
  holland: "Netherlands",
  "the netherlands": "Netherlands",
  deutschland: "Germany",
  korea: "South Korea",
  "republic of korea": "South Korea",
  "korea, republic of": "South Korea",
  prc: "China",
  "mainland china": "China",
  "people's republic of china": "China",
  "hong kong sar": "Hong Kong",
  uae: "United Arab Emirates",
  "u.a.e.": "United Arab Emirates",
  "republic of ireland": "Ireland",
  schweiz: "Switzerland",
  suisse: "Switzerland",
};

// The canonical name for whatever the student typed. Unknown countries are
// returned tidied up (trimmed) rather than rejected, so a school in a
// country this list doesn't know yet still works.
export function canonicalCountry(name: string): string {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const exact = COUNTRY_OPTIONS.find((c) => c.toLowerCase() === lower);
  return exact ?? ALIASES[lower] ?? trimmed;
}

export function countryCode(country: string): string | null {
  return (COUNTRY_CODES as Record<string, string>)[canonicalCountry(country)] ?? null;
}
