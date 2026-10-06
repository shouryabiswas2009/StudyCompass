import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createInMemoryDb } from "./in-memory-db.mjs";

// Data-changing migrations, run against a real (in-memory) Postgres with
// rows shaped the way they were before the migration.
const sql = (file) => readFileSync(join(import.meta.dirname, "..", "supabase", file), "utf8");

describe("migration_009 (multi-select focus + co-op)", () => {
  it("keeps each student's old focus, retires the old columns, and is safe to re-run", async () => {
    const { db } = await createInMemoryDb({ before: 9 });
    const research = "00000000-0000-0000-0000-000000000001";
    const balanced = "00000000-0000-0000-0000-000000000002";
    for (const id of [research, balanced]) {
      await db.query("insert into auth.users (id) values ($1)", [id]);
    }
    const profile = `insert into public.profiles (id, full_name, country, intended_majors, gpa_percentage,
      budget_min, budget_max, preferred_countries, preferred_degree_level, primary_focus)
      values ($1, 'A', 'India', '{CS}', 90, 0, 40000, '{Canada}', 'Undergraduate', $2)`;
    await db.query(profile, [research, "research"]);
    await db.query(profile, [balanced, "balanced"]);
    // A student-added school that said "yes, it has a co-op" before 009.
    await db.query(`insert into public.universities (name, country, tuition, acceptance_rate, description, created_by, source, has_coop)
      values ('My School', 'Canada', 20000, 50, '', $1, 'user-entered', true)`, [research]);

    await db.exec(sql("migration_009_multi_focus_and_coop.sql"));
    await db.exec(sql("migration_009_multi_focus_and_coop.sql")); // second run changes nothing

    const { rows } = await db.query("select id, focuses from public.profiles order by id");
    expect(rows).toEqual([
      { id: research, focuses: ["research"] },
      { id: balanced, focuses: [] }, // Balanced = nothing ticked
    ]);
    const { rows: schools } = await db.query("select coop_program from public.universities where name = 'My School'");
    expect(schools[0].coop_program).toBe("optional"); // "yes" without saying mandatory

    const { rows: oldColumns } = await db.query(`select column_name from information_schema.columns
      where table_schema = 'public' and column_name in ('primary_focus', 'has_coop')`);
    expect(oldColumns).toEqual([]);
  }, 30_000);

  it("rejects focus and co-op values outside the allowed lists", async () => {
    const { db } = await createInMemoryDb();
    await expect(db.exec("update public.profiles set focuses = '{fame}'")).resolves.toBeDefined(); // no rows yet
    await db.query("insert into auth.users (id) values ('00000000-0000-0000-0000-000000000003')");
    await expect(
      db.query(`insert into public.profiles (id, full_name, country, intended_majors, gpa_percentage,
        budget_min, budget_max, preferred_countries, preferred_degree_level, focuses)
        values ('00000000-0000-0000-0000-000000000003', 'B', 'India', '{CS}', 90, 0, 40000, '{UK}', 'Undergraduate', '{fame}')`)
    ).rejects.toThrow(/profiles_focuses_check/);
    await expect(
      db.exec("update public.universities set coop_program = 'sometimes'")
    ).rejects.toThrow(/universities_coop_check/);
  }, 30_000);
});

describe("migration_011 (curated international data)", () => {
  it("is safe to re-run, and search ignores accents and finds aliases", async () => {
    const { db } = await createInMemoryDb();
    await db.exec(sql("migration_011_international.sql")); // second run
    await db.query(`insert into public.universities (name, country, tuition, acceptance_rate, description, source, aliases, curated_id)
      values ('Université de Montréal', 'Canada', null, null, '', 'curated', '{UdeM}', 'udem')`);
    const find = async (term) =>
      (await db.query("select name from public.universities where search_text like $1", [`%${term}%`])).rows.map((r) => r.name);
    expect(await find("universite de montreal")).toEqual(["Université de Montréal"]);
    expect(await find("udem")).toEqual(["Université de Montréal"]);
  }, 30_000);

  it("allows unknown tuition and admission rate, but still won't let a student label a row curated", async () => {
    const { db } = await createInMemoryDb();
    const student = "00000000-0000-0000-0000-000000000009";
    await db.query("insert into auth.users (id) values ($1)", [student]);
    await expect(
      db.query(`insert into public.universities (name, country, tuition, acceptance_rate, description, source, created_by)
        values ('Mine', 'Canada', null, null, '', 'curated', $1)`, [student])
    ).rejects.toThrow(/universities_source_check/);
    await expect(
      db.query(`insert into public.universities (name, country, description, source, tuition_currency)
        values ('Bad currency', 'Canada', '', 'curated', 'pounds')`)
    ).rejects.toThrow(/universities_money_check/);
  }, 30_000);
});
