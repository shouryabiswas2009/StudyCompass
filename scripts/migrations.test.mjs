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

describe("migration_014 (delete my account)", () => {
  const A = "00000000-0000-0000-0000-0000000000aa";
  const B = "00000000-0000-0000-0000-0000000000bb";

  async function seedTwoStudents() {
    const { db } = await createInMemoryDb();
    for (const id of [A, B]) {
      await db.query("insert into auth.users (id) values ($1)", [id]);
      await db.query(
        `insert into public.profiles (id, full_name, country, intended_majors, gpa_percentage,
          budget_min, budget_max, preferred_countries, preferred_degree_level)
          values ($1, 'Student', 'India', '{CS}', 90, 0, 40000, '{Canada}', 'Undergraduate')`,
        [id]
      );
      // Each student adds a school, saves a shared one and tracks an application.
      await db.query(
        `insert into public.universities (name, country, tuition, acceptance_rate, description, created_by, source)
          values ($1, 'Canada', 20000, 50, '', $2, 'user-entered')`,
        [`School of ${id.slice(-2)}`, id]
      );
      const { rows } = await db.query("select id from public.universities where created_by is null order by id limit 1");
      await db.query("insert into public.saved_universities (user_id, university_id) values ($1, $2)", [id, rows[0].id]);
      await db.query("insert into public.applications (user_id, university_id) values ($1, $2)", [id, rows[0].id]);
    }
    return db;
  }

  const count = async (db, sql, params = []) => (await db.query(sql, params)).rows[0].n;

  it("deletes only the caller's account and everything that belongs to them", async () => {
    const db = await seedTwoStudents();
    const sharedBefore = await count(db, "select count(*)::int as n from public.universities where created_by is null");

    await db.exec(`set test.uid = '${A}'`); // act as student A
    await db.query("select public.delete_my_account()");

    for (const [table, column] of [["auth.users", "id"], ["public.profiles", "id"], ["public.saved_universities", "user_id"], ["public.applications", "user_id"], ["public.universities", "created_by"]]) {
      expect(await count(db, `select count(*)::int as n from ${table} where ${column} = $1`, [A])).toBe(0);
      expect(await count(db, `select count(*)::int as n from ${table} where ${column} = $1`, [B])).toBe(1);
    }
    expect(await count(db, "select count(*)::int as n from public.universities where created_by is null")).toBe(sharedBefore);
  }, 30_000);

  it("refuses when nobody is signed in, and is safe to re-run", async () => {
    const db = await seedTwoStudents();
    await db.exec("set test.uid = ''");
    await expect(db.query("select public.delete_my_account()")).rejects.toThrow(/must be signed in/);
    expect(await count(db, "select count(*)::int as n from auth.users")).toBe(2);
    await db.exec(sql("migration_014_delete_my_account.sql"));
  }, 30_000);
});

describe("migration_015 (research impact)", () => {
  const value = (fields) =>
    JSON.stringify({ overall: 80, source: "CWTS Leiden Ranking Open Edition 2025", data_year: "2020–2023", licence: "CC0 1.0", ...fields });

  it("stores a value with its source on a shared school, and is safe to re-run", async () => {
    const { db } = await createInMemoryDb();
    await db.exec(sql("migration_015_research_impact.sql"));
    const { rows } = await db.query("select id from public.universities where created_by is null order by id limit 1");
    await db.query("update public.universities set research_impact = $1::jsonb where id = $2", [value({}), rows[0].id]);
    const { rows: back } = await db.query("select research_impact->>'licence' as licence from public.universities where id = $1", [rows[0].id]);
    expect(back[0].licence).toBe("CC0 1.0");
  }, 30_000);

  it("rejects a value without its source, and any value on a student's own school", async () => {
    const { db } = await createInMemoryDb();
    const { rows } = await db.query("select id from public.universities where created_by is null order by id limit 1");
    await expect(
      db.query("update public.universities set research_impact = '{\"overall\": 80}'::jsonb where id = $1", [rows[0].id])
    ).rejects.toThrow(/universities_research_impact_check/);

    const student = "00000000-0000-0000-0000-0000000000cc";
    await db.query("insert into auth.users (id) values ($1)", [student]);
    await expect(
      db.query(
        `insert into public.universities (name, country, tuition, acceptance_rate, description, created_by, source, research_impact)
          values ('Mine', 'Canada', 1, 50, '', $1, 'user-entered', $2::jsonb)`,
        [student, value({})]
      )
    ).rejects.toThrow(/universities_research_impact_check/);
  }, 30_000);
});

describe("migration_016 (display currency)", () => {
  it("defaults to US dollars, accepts a currency code, rejects anything else, and is safe to re-run", async () => {
    const { db } = await createInMemoryDb();
    await db.exec(sql("migration_016_display_currency.sql"));
    const id = "00000000-0000-0000-0000-0000000000dd";
    await db.query("insert into auth.users (id) values ($1)", [id]);
    await db.query(
      `insert into public.profiles (id, full_name, country, intended_majors, gpa_percentage,
        budget_min, budget_max, preferred_countries, preferred_degree_level)
        values ($1, 'Student', 'India', '{CS}', 90, 0, 40000, '{Canada}', 'Undergraduate')`,
      [id]
    );
    const read = async () => (await db.query("select display_currency from public.profiles where id = $1", [id])).rows[0].display_currency;
    expect(await read()).toBe("USD");
    await db.query("update public.profiles set display_currency = 'INR' where id = $1", [id]);
    expect(await read()).toBe("INR");
    await expect(db.query("update public.profiles set display_currency = 'rupees' where id = $1", [id])).rejects.toThrow(/profiles_display_currency_check/);
  }, 30_000);
});
