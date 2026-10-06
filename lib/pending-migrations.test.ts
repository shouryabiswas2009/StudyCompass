import { describe, expect, it } from "vitest";
import { missingColumn, skippedNotice, writeSkippingPendingColumns } from "./pending-migrations";

const unknownColumn = (column: string) => ({
  error: { code: "PGRST204", message: `Could not find the '${column}' column of 'profiles' in the schema cache` },
});

describe("missingColumn", () => {
  it("reads the column name out of PostgREST's error", () => {
    expect(missingColumn(unknownColumn("focuses").error)).toBe("focuses");
  });

  it("ignores every other error", () => {
    expect(missingColumn({ code: "23514", message: "violates check constraint" })).toBeNull();
    expect(missingColumn(null)).toBeNull();
  });
});

describe("writeSkippingPendingColumns", () => {
  it("drops a not-yet-migrated column and retries", async () => {
    const seen: Record<string, unknown>[] = [];
    const { result, skipped } = await writeSkippingPendingColumns(
      { full_name: "A", focuses: ["research"] },
      async (payload) => {
        seen.push(payload);
        return "focuses" in payload ? unknownColumn("focuses") : { error: null };
      }
    );
    expect(result.error).toBeNull();
    expect(skipped).toEqual(["focuses"]);
    expect(seen[1]).toEqual({ full_name: "A" });
  });

  it("never drops a column that isn't from a pending migration", async () => {
    const { result, skipped } = await writeSkippingPendingColumns({ full_name: "A" }, async () =>
      unknownColumn("full_name")
    );
    expect(result.error?.code).toBe("PGRST204");
    expect(skipped).toEqual([]);
  });

  it("explains what wasn't saved and which file to run", () => {
    expect(skippedNotice(["focuses"])).toContain("migration_009_multi_focus_and_coop.sql");
    expect(skippedNotice([])).toBeUndefined();
  });
});
