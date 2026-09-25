import MCR from "monocart-coverage-reports"

export const collectCoverage = !!process.env.E2E_COVERAGE

export const coverageOptions = {
  name: "Snort e2e coverage",
  outputDir: "./coverage-e2e",
  reports: ["v8", "console-summary", "json-summary"] as Array<"v8" | "console-summary" | "json-summary">,
  entryFilter: (entry: { url: string }) => entry.url.includes("/assets/") && entry.url.endsWith(".js"),
  sourceFilter: (path: string) => path.startsWith("src/") && !path.includes("node_modules"),
  all: {
    dir: ["./src"],
    filter: (path: string) => /\.tsx?$/.test(path) && !path.endsWith(".d.ts") && !path.includes("/translations/"),
  },
}

export async function addCoverage(entries: Array<unknown>) {
  await MCR(coverageOptions).add(entries)
}
