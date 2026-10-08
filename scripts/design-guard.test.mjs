// The design guard (docs/DESIGN-SYSTEM.md): fails if the old "soft card"
// look creeps back in: big rounded corners or heavy shadows in the app's
// own components and pages. Anything that truly needs one goes in ALLOWED,
// with the reason.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const FORBIDDEN = /\b(rounded-(?:2xl|3xl|4xl)|rounded-\[\d|shadow-(?:lg|xl|2xl))\b/g;

// "path/file.tsx": "why it may use one". Keep this short.
const ALLOWED = {};

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" || name.startsWith(".") ? [] : files(path);
    return /\.(tsx|ts|css)$/.test(name) ? [path] : [];
  });
}

describe("design guard", () => {
  it("uses no big radius or heavy shadow outside the allow-list", () => {
    const problems = [];
    for (const file of [...files(join(ROOT, "components")), ...files(join(ROOT, "app"))]) {
      const rel = relative(ROOT, file).replaceAll("\\", "/");
      if (rel in ALLOWED) continue;
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(FORBIDDEN)) {
        const line = text.slice(0, match.index).split("\n").length;
        problems.push(`${rel}:${line} ${match[0]}`);
      }
    }
    expect(problems, "Use rounded-md/lg and at most shadow-md (see docs/DESIGN-SYSTEM.md)").toEqual([]);
  });
});
