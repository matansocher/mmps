export function queryParamsToObject(queryString: string): Record<string, unknown> {
  if (!queryString) {
    return {};
  }
  return queryString
    .split('&')
    .map((param: string) => param.split('='))
    .reduce((acc: Record<string, string>, [key, value]) => {
      acc[decodeURIComponent(key)] = decodeURIComponent(value);
      return acc;
    }, {});
}
