export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly method: string;
  readonly path: string;

  constructor(status: number, body: unknown, method: string, path: string) {
    super(`Request failed: ${method} ${path} (${status})`);
    this.name = ApiError.name;
    this.status = status;
    this.body = body;
    this.method = method;
    this.path = path;
  }
}

export type JsonRequesterOptions = {
  readonly credentials?: RequestCredentials;
  readonly headers?: () => HeadersInit;
};

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function createJsonRequester(options: JsonRequesterOptions = {}) {
  return async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(options.headers?.());
    if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));

    const response = await fetch(path, {
      ...init,
      credentials: init?.credentials ?? options.credentials,
      headers,
    });
    const body = await parseResponseBody(response);

    if (!response.ok) {
      const method = init?.method?.toUpperCase() ?? 'GET';
      throw new ApiError(response.status, body, method, path);
    }

    return body as T;
  };
}
