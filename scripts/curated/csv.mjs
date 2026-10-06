// A small CSV reader/writer (RFC 4180: commas, double quotes, "" for a quote
// inside a quoted field, newlines inside quotes). Enough for the curated
// files, which are edited by hand in a spreadsheet or text editor, without
// adding a dependency.

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, ""); // ignore a byte-order mark from Excel

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((cell) => cell.trim() !== ""));
  if (!header) return [];
  return body.map((cells, i) => {
    const record = { _line: i + 2 }; // line numbers for error messages (header is line 1)
    header.forEach((name, j) => (record[name.trim()] = (cells[j] ?? "").trim()));
    return record;
  });
}

export function toCsv(header, records) {
  const cell = (value) => {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [header.join(","), ...records.map((r) => header.map((h) => cell(r[h])).join(","))].join("\n") + "\n";
}
