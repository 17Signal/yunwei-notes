import { NextResponse } from "next/server";

type ErrorPayload = {
  error: string;
  code: string;
  details?: unknown;
};

export function apiOk<T>(data: T, init?: ResponseInit): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, init);
}

export function apiOkWithPagination<T>(
  data: T,
  pagination: { page: number; pageSize: number; total: number; totalPages: number },
  init?: ResponseInit
): NextResponse<{ data: T; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
  return NextResponse.json({ data, pagination }, init);
}

export function apiError(status: number, error: string, code: string, details?: unknown): NextResponse<ErrorPayload> {
  return NextResponse.json(
    {
      error,
      code,
      ...(details === undefined ? {} : { details }),
    },
    { status }
  );
}
