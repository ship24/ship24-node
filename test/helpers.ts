import { Ship24, type Ship24Config } from '../src/index.js';

export type FetchHandler = (url: string, init: RequestInit) => Response | Promise<Response>;

export interface RecordedCall {
  url: string;
  init: RequestInit;
}

export function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export function textResponse(
  status: number,
  text: string,
  headers: Record<string, string> = {},
): Response {
  return new Response(text, { status, headers });
}

export function makeClient(
  handler: FetchHandler,
  config: Omit<Partial<Ship24Config>, 'apiKey' | 'fetch'> = {},
): { client: Ship24; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetchImpl = (async (input: unknown, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    return handler(String(input), init);
  }) as unknown as typeof fetch;
  const client = new Ship24({ apiKey: 'test-key', fetch: fetchImpl, ...config });
  return { client, calls };
}
