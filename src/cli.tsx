/**
 * CLI initialization and Ink app rendering
 */

import { render } from "ink";
import { App } from "./App.js";

export interface CLIOptions {
  /** Command line arguments */
  args: string[];
  /** Enable verbose output */
  verbose?: boolean;
}

/**
 * Main CLI entry point - renders the Ink app
 */
export const runCLI = (options: CLIOptions): void => {
  const { args, verbose = false } = options;

  // Render the Ink app
  const { waitUntilExit } = render(<App args={args} verbose={verbose} />);

  // Wait for app to exit and handle the result
  waitUntilExit()
    .then(() => {
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error("CLI Error:", error.message);
      process.exit(1);
    });
};
