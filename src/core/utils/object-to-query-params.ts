export function objectToQueryParams(obj: Record<string, any>): string {
  return Object.keys(obj)
    .map((key: string) => encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]))
    .join('&');
}
