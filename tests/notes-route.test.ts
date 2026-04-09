import { beforeEach, describe, expect, it, vi } from "vitest";

const searchNotesMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({}));

vi.mock("@/lib/db-search", () => ({
  searchNotes: searchNotesMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
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
          categoryId: "33333333-3333-4333-8333-333333333333",
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
    const response = await GET(
      new Request(
        "http://localhost/api/notes?page=1&pageSize=20&categoryId=33333333-3333-4333-8333-333333333333&q=hello%20world&starred=true&pinned=false"
      )
    );
    const payload = await response.json();

    expect(searchNotesMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      categoryId: "33333333-3333-4333-8333-333333333333",
      q: "hello world",
      pinned: false,
      starred: true,
    });
    expect(response.status).toBe(200);
    expect(payload.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    expect(payload.data[0]).toMatchObject({
      id: "22222222-2222-2222-2222-222222222222",
      categoryId: "33333333-3333-4333-8333-333333333333",
      title: "First note",
      categoryName: "Default",
      starred: false,
      pinned: false,
    });
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
