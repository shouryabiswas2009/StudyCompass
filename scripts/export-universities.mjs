// Writes ml/data/universities.csv from the SQL seed + migrations, so the
// Python model pipeline uses exactly the same (illustrative) university
// figures as the app. Run with: npm run ml:export-universities
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInMemoryDb } from "./in-memory-db.mjs";

const OUT = join(import.meta.dirname, "..", "ml", "data", "universities.csv");
const COLUMNS = [
  "name",
  "country",
  "tuition",
  "qs_ranking",
  "acceptance_rate",
  "avg_admitted_gpa",
  "sat_25",
  "sat_75",
  "min_ielts",
];

const { db, applied } = await createInMemoryDb();
const { rows } = await db.query(
  `select ${COLUMNS.join(", ")} from public.universities
   where created_by is null
   order by name`
);

// Minimal CSV: quote every text field, leave numbers bare, nulls empty.
const cell = (v) =>
  v === null || v === undefined ? "" : typeof v === "string" && isNaN(Number(v))
    ? `"${v.replaceAll('"', '""')}"`
    : String(v);

const csv = [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(","))].join("\n");

mkdirSync(join(OUT, ".."), { recursive: true });
writeFileSync(OUT, csv + "\n");
console.log(`Applied ${applied.length} SQL files; wrote ${rows.length} universities to ml/data/universities.csv`);
