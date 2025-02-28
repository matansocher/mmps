export function queryParamsToObject(queryString: string): Record<string, unknown> {
  if (!queryString) {
    return {};
  }
  return queryString
    .split('&')
    .map((param: string) => param.split('='))
    .reduce((acc, [key, value]) => {
      acc[decodeURIComponent(key)] = decodeURIComponent(value);
      return acc;
    }, {});
}
