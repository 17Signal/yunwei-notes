import { describe, expect, it } from "vitest";

import { parseNoteQuery } from "../lib/validators";

describe("parseNoteQuery", () => {
  it("parses boolean filters from query string", () => {
    const parsed = parseNoteQuery(new URLSearchParams("page=2&pageSize=30&starred=true&pinned=false"));

    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(30);
    expect(parsed.starred).toBe(true);
    expect(parsed.pinned).toBe(false);
  });

  it("rejects invalid boolean query values", () => {
    expect(() => parseNoteQuery(new URLSearchParams("starred=yes"))).toThrow();
    expect(() => parseNoteQuery(new URLSearchParams("pinned=0"))).toThrow();
  });
});
