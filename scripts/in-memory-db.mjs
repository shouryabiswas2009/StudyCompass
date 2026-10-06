// Builds a throwaway, in-memory copy of the StudyCompass database by running
// supabase/seed.sql and every supabase/migration_*.sql in order, using PGlite
// (real PostgreSQL compiled to run inside Node). Nothing touches Supabase.
//
// Used by scripts that need the same data the app has, without a network
// connection or database credentials.
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SUPABASE_DIR = join(import.meta.dirname, "..", "supabase");

// `before`: stop before this migration number (e.g. 9 applies up to 008),
// so a test can add old-style rows and then check a migration converts them.
export async function createInMemoryDb({ before = Infinity } = {}) {
  const db = new PGlite();

  // Minimal stand-ins for the parts of Supabase the migrations reference.
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  `);

  const migrations = readdirSync(SUPABASE_DIR)
    .filter((f) => /^migration_\d+.*\.sql$/.test(f))
    .filter((f) => Number(f.match(/^migration_(\d+)/)[1]) < before)
    .sort();

  for (const file of ["seed.sql", ...migrations]) {
    await db.exec(readFileSync(join(SUPABASE_DIR, file), "utf8"));
  }

  return { db, applied: ["seed.sql", ...migrations] };
}
