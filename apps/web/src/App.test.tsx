import type { SelectHTMLAttributes } from "react";
import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import type { LibraryItem } from "./types";
// These tests isolate application state and network behavior. Real custom-menu
// focus, keyboard selection, dismissal, and dialog portals are checked in-browser.
vi.mock("./components/Select", () => ({
  Select: (props: SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} />
  ),
}));
afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
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
  fireEvent.change(
    within(screen.getByRole("dialog")).getByRole("combobox", {
      name: "Status",
    }),
    {
      target: { value: "in_progress" },
    },
  );
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
  expect(
    within(screen.getByRole("dialog")).getByRole("combobox", {
      name: "Status",
    }),
  ).toHaveValue("in_progress");
  client.clear();
  vi.restoreAllMocks();
});
test("media selector routes search requests to the selected catalog", async () => {
  const fetcher = vi.fn((url: string) =>
    Promise.resolve(
      new Response(
        JSON.stringify(
          url.endsWith("/session")
            ? { user: { id: "reader", email: "reader@example.invalid" } }
            : url.endsWith("/config")
              ? { providers: { book: true, movie: true, tv: true, game: true } }
              : [],
        ),
      ),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  const client = mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "Search", exact: true }),
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Media type" }), {
    target: { value: "game" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Search games" }), {
    target: { value: "Hades" },
  });
  await waitFor(() =>
    expect(
      fetcher.mock.calls.some(
        ([url]) => url.includes("type=game") && url.includes("q=Hades"),
      ),
    ).toBe(true),
  );
  client.clear();
});
test("recovery links are usable even with an existing signed-in session", async () => {
  window.history.replaceState({}, "", "/#reset=synthetic-link-for-test-only");
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            url.endsWith("/session")
              ? { user: { id: "reader", email: "reader@example.invalid" } }
              : [],
          ),
        ),
      ),
    ),
  );
  const client = mount();
  expect(
    await screen.findByRole("button", { name: "Set new password" }),
  ).toBeInTheDocument();
  client.clear();
});
test("successful saves close the item and clear its deep link", async () => {
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
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            init?.method === "PATCH"
              ? { ...item, version: 2 }
              : url.endsWith("/session")
                ? { user: { id: "reader", email: "reader@example.invalid" } }
                : url.endsWith("/config")
                  ? {}
                  : [item],
          ),
        ),
      ),
    ),
  );
  const client = mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "Open Test story" }),
  );
  expect(window.location.search).toContain("item=");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(window.location.search).not.toContain("item=");
  client.clear();
});

test("navigation groups secondary tools and palette works with evening mode", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            url.endsWith("/session")
              ? { user: { id: "reader", email: "reader@example.invalid" } }
              : url.endsWith("/library")
                ? [item]
                : {},
          ),
        ),
      ),
    ),
  );
  const client = mount();
  const nav = await screen.findByRole("navigation", {
    name: "Main navigation",
  });
  expect(
    within(nav)
      .getAllByRole("button")
      .map((b) => b.textContent),
  ).toEqual(["Library", "Discover", "Journal"]);
  fireEvent.click(screen.getByText("Profile & settings"));
  fireEvent.click(screen.getByRole("button", { name: "Evening", exact: true }));
  const world = screen.getByRole("main");
  const before = world.style.getPropertyValue("--scene-start");
  fireEvent.click(screen.getByRole("button", { name: "Ocean", exact: true }));
  expect(world).toHaveClass("dusk");
  expect(world.style.getPropertyValue("--scene-start")).not.toBe(before);
  expect(localStorage.getItem("marqd-palette")).toBe("Ocean");
  fireEvent.click(within(nav).getByRole("button", { name: "Journal" }));
  fireEvent.click(screen.getByRole("button", { name: "Insights & goals" }));
  expect(window.location.pathname).toBe("/stats");
  client.clear();
  localStorage.clear();
});
