export function logDebugError(functionName: string, error: unknown, context?: unknown): void {
  const timestamp = new Date().toISOString();
  const message = `[DEBUG] ${timestamp} ${functionName}`;

  if (context === undefined) {
    console.error(message, error instanceof Error ? error : new Error(String(error)));
    return;
  }

  console.error(message, { context, error });
}
