// Small helpers for reading <form> submissions in server actions and
// validators. FormData only gives back strings, so these convert them.

export function readText(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

// Blank → null (optional field left empty), junk → NaN (caught by the caller).
export function readNumber(formData: FormData, name: string): number | null {
  const raw = readText(formData, name);
  return raw === "" ? null : Number(raw);
}

// Every value submitted under `name` (tag inputs, checkboxes), blanks dropped.
export function readList(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .map((value) => String(value).trim())
    .filter(Boolean);
}
