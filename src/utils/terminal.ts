/**
 * Terminal utility functions for detecting terminal dimensions and capabilities
 */

/**
 * Default terminal width fallback when unable to detect
 */
const DEFAULT_TERMINAL_WIDTH = 80;

/**
 * Minimum reasonable terminal width
 */
const MIN_TERMINAL_WIDTH = 40;

/**
 * Maximum reasonable terminal width
 */
const MAX_TERMINAL_WIDTH = 200;

/**
 * Get the current terminal width
 *
 * @returns The terminal width in columns, or DEFAULT_TERMINAL_WIDTH if unable to detect
 *
 * @example
 * ```ts
 * import { getTerminalWidth } from "./utils/terminal.js";
 *
 * const width = getTerminalWidth();
 * console.log(`Terminal width: ${width} columns`);
 * ```
 */
export function getTerminalWidth(): number {
  // Try to get width from stdout
  if (process.stdout.columns) {
    const width = process.stdout.columns;
    // Clamp to reasonable bounds
    return Math.max(MIN_TERMINAL_WIDTH, Math.min(MAX_TERMINAL_WIDTH, width));
  }

  // Try to get from stderr as fallback
  if (process.stderr.columns) {
    const width = process.stderr.columns;
    return Math.max(MIN_TERMINAL_WIDTH, Math.min(MAX_TERMINAL_WIDTH, width));
  }

  // Return default if unable to detect
  return DEFAULT_TERMINAL_WIDTH;
}

/**
 * Get the current terminal height
 *
 * @returns The terminal height in rows, or 24 if unable to detect
 *
 * @example
 * ```ts
 * import { getTerminalHeight } from "./utils/terminal.js";
 *
 * const height = getTerminalHeight();
 * console.log(`Terminal height: ${height} rows`);
 * ```
 */
export function getTerminalHeight(): number {
  const DEFAULT_HEIGHT = 24;
  const MIN_HEIGHT = 10;
  const MAX_HEIGHT = 100;

  if (process.stdout.rows) {
    const height = process.stdout.rows;
    return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, height));
  }

  if (process.stderr.rows) {
    const height = process.stderr.rows;
    return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, height));
  }

  return DEFAULT_HEIGHT;
}

/**
 * Get terminal dimensions (width and height)
 *
 * @returns Object containing width and height
 *
 * @example
 * ```ts
 * import { getTerminalSize } from "./utils/terminal.js";
 *
 * const { width, height } = getTerminalSize();
 * console.log(`Terminal size: ${width}x${height}`);
 * ```
 */
export function getTerminalSize(): { width: number; height: number } {
  return {
    width: getTerminalWidth(),
    height: getTerminalHeight(),
  };
}

/**
 * Create a separator line of a given width
 *
 * @param char - Character to use for the separator (default: "━")
 * @param width - Width of the separator. If not provided, uses terminal width.
 * @param maxWidth - Optional maximum width to cap the separator at
 *
 * @returns A string separator of the specified width
 *
 * @example
 * ```ts
 * import { createSeparator } from "./utils/terminal.js";
 *
 * // Use full terminal width
 * const fullSeparator = createSeparator();
 *
 * // Use specific width
 * const fixedSeparator = createSeparator("━", 60);
 *
 * // Use terminal width but cap at 80
 * const cappedSeparator = createSeparator("━", undefined, 80);
 * ```
 */
export function createSeparator(
  char = "━",
  width?: number,
  maxWidth?: number,
): string {
  const terminalWidth = width ?? getTerminalWidth();
  const finalWidth = maxWidth
    ? Math.min(terminalWidth, maxWidth)
    : terminalWidth;

  return char.repeat(finalWidth);
}

/**
 * Check if the current process is running in a TTY (interactive terminal)
 *
 * @returns true if running in a TTY, false otherwise
 *
 * @example
 * ```ts
 * import { isTTY } from "./utils/terminal.js";
 *
 * if (isTTY()) {
 *   console.log("Running in an interactive terminal");
 * } else {
 *   console.log("Running in a non-interactive environment (piped, redirected, etc.)");
 * }
 * ```
 */
export function isTTY(): boolean {
  return process.stdout.isTTY === true;
}
