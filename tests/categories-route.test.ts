import "dotenv/config";

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: prismaMocks.findMany,
    },
  },
}));

describe("categories route", () => {
  beforeEach(() => {
    prismaMocks.findMany.mockReset();
  });

  it("returns categories sorted from the prisma layer", async () => {
    prismaMocks.findMany.mockResolvedValue([
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "Work",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]);

    const { GET } = await import("../app/api/categories/route");
    const response = await GET();
    const payload = await response.json();

    expect(prismaMocks.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
    });
    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0]).toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
      name: "Work",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });
});
