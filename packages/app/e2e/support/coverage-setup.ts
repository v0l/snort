import MCR from "monocart-coverage-reports"

import { collectCoverage, coverageOptions } from "./coverage"

export default async function globalSetup() {
  if (collectCoverage) MCR(coverageOptions).cleanCache()
}
