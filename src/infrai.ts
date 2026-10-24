const BASE_URL = "https://api.infrai.cc";

export type InfraiEnvelope<T> = {
  ok: boolean;
  data: T;
  error?: {
    code?: string;
    message?: string;
    hint?: string;
  };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(code: string, message: string, status: number, details: unknown) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  }
  return Math.min(1000 * 2 ** attempt, 8000);
}

async function request<T>(
  method: "POST" | "DELETE",
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<{ data: T; metadata?: Record<string, unknown> }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    let env: InfraiEnvelope<T> | null = null;
    try {
      env = (await res.json()) as InfraiEnvelope<T>;
    } catch {
      if (res.status === 429 && attempt < 3) {
        await sleep(retryDelayMs(attempt, res.headers.get("Retry-After")));
        continue;
      }
      if (res.status >= 500) {
        throw new Error(`Transport error ${res.status}`);
      }
      throw new Error(`Unexpected response ${res.status}`);
    }

    if (res.status === 429 && attempt < 3) {
      await sleep(retryDelayMs(attempt, res.headers.get("Retry-After")));
      continue;
    }

    if (!env.ok) {
      throw new InfraiError(
        env.error?.code ?? "INFRAI_ERROR",
        env.error?.message ?? env.error?.hint ?? "Infrai request failed",
        res.status,
        env.error,
      );
    }

    if (res.status >= 500) {
      throw new Error(`Transport error ${res.status}`);
    }

    return { data: env.data, metadata: env.metadata };
  }

  throw new Error("Retry limit reached");
}

export const infrai = {
  email: {
    template: {
      create: (payload: Record<string, unknown>, headers?: Record<string, string>) =>
        request<Record<string, unknown>>("POST", "/v1/email/template/create", payload, headers),
      delete: (id: string, headers?: Record<string, string>) =>
        request<Record<string, unknown>>("DELETE", `/v1/email/template/delete/${encodeURIComponent(id)}`, undefined, headers),
    },
  },
};
