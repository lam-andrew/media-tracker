import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import type { LibraryItem } from "./types";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const item: LibraryItem = {
  id: "00000000-0000-4000-8000-000000000001",
  version: 1,
  source: "openlibrary",
  externalId: "/works/OL1W",
  type: "book",
  title: "Test story",
  creators: ["Author"],
  image: null,
  description: "A story",
  metadata: {},
  tracking: {
    status: "backlog",
    rating: null,
    current: 0,
    total: 100,
    favorite: false,
    notes: "",
  },
};
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
  return client;
}
test("navigation responds while library data is still loading", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      url.endsWith("/session")
        ? Promise.resolve(
            new Response(
              JSON.stringify({
                user: { id: "reader", email: "reader@example.invalid" },
              }),
            ),
          )
        : new Promise(() => {}),
    ),
  );
  const client = mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "Search", exact: true }),
  );
  expect(
    screen.getByRole("textbox", { name: "Search books" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Enter at least two characters to search."),
  ).toBeInTheDocument();
  client.clear();
});
test("failed optimistic save restores the library and preserves the draft", async () => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
  let failSave: (() => void) | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH")
        return new Promise<Response>((resolve) => {
          failSave = () =>
            resolve(
              new Response(JSON.stringify({ error: "Save unavailable" }), {
                status: 503,
              }),
            );
        });
      return Promise.resolve(
        new Response(
          JSON.stringify(
            url.endsWith("/session")
              ? { user: { id: "reader", email: "reader@example.invalid" } }
              : [item],
          ),
        ),
      );
    }),
  );
  const client = mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "Open Test story" }),
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Status" }), {
    target: { value: "in_progress" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(
      client.getQueryData<LibraryItem[]>(["library", "reader"])?.[0].tracking
        .status,
    ).toBe("in_progress"),
  );
  await waitFor(() => expect(failSave).toBeDefined());
  failSave!();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Save unavailable",
  );
  expect(
    client.getQueryData<LibraryItem[]>(["library", "reader"])?.[0].tracking
      .status,
  ).toBe("backlog");
  expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue(
    "in_progress",
  );
  client.clear();
  vi.restoreAllMocks();
});
