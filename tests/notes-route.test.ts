import "dotenv/config";

import { beforeEach, describe, expect, it, vi } from "vitest";

const searchNotesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db-search", () => ({
  searchNotes: searchNotesMock,
}));

describe("notes route", () => {
  beforeEach(() => {
    searchNotesMock.mockReset();
  });

  it("returns paginated note search results", async () => {
    searchNotesMock.mockResolvedValue({
      data: [
        {
          id: "22222222-2222-2222-2222-222222222222",
          categoryId: "33333333-3333-3333-3333-333333333333",
          title: "First note",
          contentPreview: "hello",
          starred: false,
          pinned: false,
          categoryName: "Default",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
      totalPages: 1,
    });

    const { GET } = await import("../app/api/notes/route");
    const response = await GET(new Request("http://localhost/api/notes?page=1&pageSize=20"));
    const payload = await response.json();

    expect(searchNotesMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      categoryId: undefined,
      q: undefined,
      pinned: undefined,
      starred: undefined,
    });
    expect(response.status).toBe(200);
    expect(payload.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    expect(payload.data[0].title).toBe("First note");
  });

  it("returns 400 for invalid query params", async () => {
    const { GET } = await import("../app/api/notes/route");
    const response = await GET(new Request("http://localhost/api/notes?categoryId=not-a-uuid"));
    const payload = await response.json();

    expect(searchNotesMock).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      error: "Invalid query parameters.",
      code: "VALIDATION_ERROR",
    });
  });
});
