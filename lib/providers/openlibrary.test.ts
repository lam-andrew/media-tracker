import { describe, it, expect, vi, afterEach } from "vitest";
import { openLibraryProvider } from "./openlibrary";

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status < 300,
    status,
    json: async () => body,
  } as Response);
}

afterEach(() => vi.unstubAllGlobals());

describe("openLibraryProvider.getById", () => {
  it("resolves author names from the work's author keys (bounded to 3)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/works/OL1W.json")) {
          return json({
            title: "Ironbound",
            description: "Castor has a *Cor* Heart.",
            authors: [
              { author: { key: "/authors/OL1A" } },
              { author: { key: "/authors/OL2A" } },
              { author: { key: "/authors/OL3A" } },
              { author: { key: "/authors/OL4A" } },
            ],
          });
        }
        if (url.endsWith("/authors/OL2A.json")) return json({}, 404);
        const n = /OL(\d)A/.exec(url)?.[1];
        return json({ name: `Author ${n}` });
      }),
    );
    const item = await openLibraryProvider.getById("/works/OL1W");
    expect(item?.creators).toEqual(["Author 1", "Author 3"]);
    expect(item?.metadata.description).toContain("*Cor*");
  });
});
