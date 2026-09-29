import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Import } from "./Import";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <main className="world">
        <Import />
      </main>
    </QueryClientProvider>,
  );
}
function upload(name: string, text: string) {
  const file = new File([text], name);
  Object.defineProperty(file, "text", { value: () => Promise.resolve(text) });
  fireEvent.change(screen.getByLabelText("Choose an export"), {
    target: { files: [file] },
  });
}
test("CSV review keeps writes behind explicit import and shows unmatched rows", async () => {
  const fetcher = vi.fn((_url: string, _init?: RequestInit) =>
    Promise.resolve(new Response("[]")),
  );
  vi.stubGlobal("fetch", fetcher);
  mount();
  upload(
    "books.csv",
    "Book Id,Title,Author,My Rating,Exclusive Shelf\n1,Unmatched story,An Author,4,to-read",
  );
  expect(
    await screen.findByRole("heading", { name: "Review your collection" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Import 0 entries" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("combobox", { name: "Match Unmatched story" }),
  ).toHaveTextContent("Skip / no match");
  expect(
    fetcher.mock.calls.every(
      ([, init]) => !init?.method || init.method === "GET",
    ),
  ).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test("invalid backup explains failure without exposing an import action", async () => {
  vi.stubGlobal("fetch", vi.fn());
  mount();
  upload("backup.json", '{"format":"wrong"}');
  expect(await screen.findByRole("status")).toHaveTextContent(
    "not a supported library backup",
  );
  expect(
    screen.queryByRole("button", { name: /Import \d/ }),
  ).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
