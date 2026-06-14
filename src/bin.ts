#!/usr/bin/env node
import { run } from "./cli.js";
import { printError } from "./output.js";

run(process.argv).catch((error: unknown) => {
  printError(error, process.argv.includes("--json") ? "json" : "human");
  process.exitCode = 1;
});
