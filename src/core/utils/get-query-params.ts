export function getQueryParams(urlString: string) {
  const parsedUrl = new URL(urlString);
  const queryParams = {};

  for (const [key, value] of parsedUrl.searchParams.entries()) {
    queryParams[key] = value;
  }

  return queryParams;
}
