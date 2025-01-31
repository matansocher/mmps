export function getErrorMessage(error: Error): string {
  return error instanceof Error ? error.message : JSON.stringify(error);
}
