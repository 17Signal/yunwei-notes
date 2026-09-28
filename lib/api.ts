import { NextResponse } from "next/server";

type ErrorPayload = {
  error: string;
  code: string;
  details?: unknown;
};

export async function readRequestBody(
  request: Request,
  maxBytes: number,
): Promise<Buffer> {
  if (!request.body) throw new SyntaxError("Missing request body.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new SyntaxError("Request payload exceeds the size limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

export async function readJson(request: Request): Promise<unknown> {
  return JSON.parse(
    (await readRequestBody(request, 1024 * 1024)).toString("utf8"),
  );
}

export function apiOk<T>(
  data: T,
  init?: ResponseInit,
): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, init);
}

export function apiOkWithPagination<T>(
  data: T,
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  },
  init?: ResponseInit,
): NextResponse<{
  data: T;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> {
  return NextResponse.json({ data, pagination }, init);
}

export function apiError(
  status: number,
  error: string,
  code: string,
  details?: unknown,
): NextResponse<ErrorPayload> {
  return NextResponse.json(
    {
      error,
      code,
      ...(details === undefined ? {} : { details }),
    },
    { status },
  );
}
