export function getQueryParams(urlString: string): Record<string, string> {
  const parsedUrl = new URL(urlString);
  const queryParams: Record<string, string> = {};

  for (const [key, value] of parsedUrl.searchParams.entries()) {
    queryParams[key] = value;
  }

  return queryParams;
}
