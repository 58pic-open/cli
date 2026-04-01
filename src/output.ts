export type OutputFormat = "json" | "pretty" | "table";

export function printData(format: OutputFormat, data: unknown): void {
  if (format === "json") {
    console.log(JSON.stringify(data));
    return;
  }
  if (format === "pretty") {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  // table: only meaningful for search list
  if (
    data &&
    typeof data === "object" &&
    "list" in data &&
    Array.isArray((data as { list: unknown }).list)
  ) {
    const d = data as {
      list: Array<Record<string, unknown>>;
      total_page?: number;
    };
    const rows = d.list;
    for (const row of rows) {
      const pid = row.pid ?? "";
      const title = String(row.title ?? "").slice(0, 60);
      console.log(`${pid}\t${title}`);
    }
    if (d.total_page != null) {
      console.error(`(total_page: ${d.total_page})`);
    }
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

export function printEnvelope(
  format: OutputFormat,
  http: number,
  body: unknown,
  exitOnError: boolean
): void {
  const ok =
    http >= 200 &&
    http < 300 &&
    body &&
    typeof body === "object" &&
    "code" in body &&
    (body as { code: number }).code === 200;
  const payload =
    body && typeof body === "object" && "data" in body
      ? (body as { data: unknown }).data
      : body;
  if (format === "json") {
    console.log(JSON.stringify({ http, body }));
  } else if (format === "pretty") {
    console.log(JSON.stringify({ http, body }, null, 2));
  } else if (ok && payload !== undefined) {
    printData("table", payload);
  } else {
    console.log(JSON.stringify(body, null, 2));
  }
  if (exitOnError && !ok) {
    process.exitCode = http >= 400 ? 1 : 2;
  }
}
