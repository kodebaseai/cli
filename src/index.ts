/**
 * Kodebase CLI - Main entry point
 * @packageDocumentation
 */

import { runCLI } from "./cli.js";

export const version = "1.0.1";

// Parse command line arguments
const args = process.argv.slice(2); // Remove node and script path
const verbose = args.includes("--verbose") || args.includes("-V");

// Filter out verbose flag from args
const cleanArgs = args.filter((arg) => arg !== "--verbose" && arg !== "-V");

// Run the CLI
runCLI({ args: cleanArgs, verbose });
