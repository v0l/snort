import MCR from "monocart-coverage-reports"

import { collectCoverage, coverageOptions } from "./coverage"

export default async function globalTeardown() {
  if (collectCoverage) await MCR(coverageOptions).generate()
}
