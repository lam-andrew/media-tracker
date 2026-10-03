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
import { Collections } from "./Collections";
import type { LibraryItem } from "../types";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});
const item: LibraryItem = {
  id: "book-1",
  version: 1,
  type: "book",
  source: "openlibrary",
  externalId: "OL1W",
  title: "A quiet story",
  creators: ["River Lane"],
  image: null,
  description: "",
  metadata: {},
  tracking: {
    status: "backlog",
    rating: null,
    current: 0,
    total: null,
    favorite: false,
    notes: "",
  },
};
type Collection = { id: string; name: string; itemIds: string[] };
function server(initial: Collection[] = []) {
  let collections = structuredClone(initial);
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const parts = url.split("/");
    if (method === "POST")
      collections.push({
        id: "new",
        name: JSON.parse(init!.body as string).name,
        itemIds: [],
      });
    if (method === "PATCH")
      collections = collections.map((c) =>
        c.id === parts[3]
          ? { ...c, name: JSON.parse(init!.body as string).name }
          : c,
      );
    if (parts[4] === "items")
      collections = collections.map((c) =>
        c.id !== parts[3]
          ? c
          : {
              ...c,
              itemIds:
                method === "PUT"
                  ? [...c.itemIds, parts[5]]
                  : c.itemIds.filter((id) => id !== parts[5]),
            },
      );
    else if (method === "DELETE")
      collections = collections.filter((c) => c.id !== parts[3]);
    return new Response(
      JSON.stringify(method === "GET" ? collections : { ok: true }),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
function mount(items = [item]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const open = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <Collections items={items} open={open} />
    </QueryClientProvider>,
  );
  return { client, open };
}
const initial = [{ id: "weekend", name: "Weekend", itemIds: [] }];

test("creates a trimmed collection and selects it after refetch", async () => {
  const fetcher = server();
  const { client } = mount();
  await screen.findByText("No collections yet. Give your first one a name.");
  const create = screen.getByRole("button", { name: "Create collection" });
  expect(create).toBeDisabled();
  fireEvent.change(screen.getByLabelText("New collection name"), {
    target: { value: "  Weekend  " },
  });
  fireEvent.click(create);
  await screen.findByRole("button", { name: "Add A quiet story to Weekend" });
  await waitFor(() =>
    expect(screen.getByLabelText("New collection name")).toBeEnabled(),
  );
  expect(create).toBeDisabled();
  expect(fetcher).toHaveBeenCalledWith(
    "/api/collections",
    expect.objectContaining({ method: "POST", body: '{"name":"Weekend"}' }),
  );
  await waitFor(() =>
    expect(client.getQueryData(["collections"])).toEqual(
      initial.map((c) => ({ ...c, id: "new" })),
    ),
  );
  expect(screen.getByLabelText("New collection name")).toHaveValue("");
});

test("searches creators, adds and removes membership without changing other collections", async () => {
  const fetcher = server([
    ...initial,
    { id: "favorites", name: "Favorites", itemIds: [item.id] },
  ]);
  const { client, open } = mount();
  const add = await screen.findByRole("button", {
    name: "Add A quiet story to Weekend",
  });
  fireEvent.change(screen.getByLabelText("Search your library"), {
    target: { value: "River" },
  });
  fireEvent.click(add);
  const remove = await screen.findByRole("button", {
    name: "Remove A quiet story from Weekend",
  });
  await waitFor(() => expect(remove).toBeEnabled());
  expect(fetcher).toHaveBeenCalledWith(
    "/api/collections/weekend/items/book-1",
    expect.objectContaining({ method: "PUT" }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Book.*A quiet story/i }));
  expect(open).toHaveBeenCalledWith(item);
  fireEvent.click(remove);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Add A quiet story to Weekend" }),
    ).toBeEnabled(),
  );
  expect(fetcher).toHaveBeenCalledWith(
    "/api/collections/weekend/items/book-1",
    expect.objectContaining({ method: "DELETE" }),
  );
  expect(
    client
      .getQueryData<Collection[]>(["collections"])
      ?.find((c) => c.id === "favorites")?.itemIds,
  ).toEqual([item.id]);
  fireEvent.change(screen.getByLabelText("Search your library"), {
    target: { value: "missing" },
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "No library items match",
  );
});

test("renames and requires explicit confirmation before deleting only the collection", async () => {
  const fetcher = server(initial);
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Rename" }));
  fireEvent.change(screen.getByLabelText("Collection name"), {
    target: { value: "Slow Sundays" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Delete collection" }),
    ).toBeEnabled(),
  );
  expect(
    await screen.findByRole("heading", { name: "Slow Sundays" }),
  ).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledWith(
    "/api/collections/weekend",
    expect.objectContaining({
      method: "PATCH",
      body: '{"name":"Slow Sundays"}',
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Delete collection" }));
  const confirmation = screen.getByRole("group", {
    name: "Confirm collection deletion",
  });
  expect(confirmation).toHaveTextContent(
    "Your library items and other collections will stay as they are.",
  );
  expect(fetcher.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(
    false,
  );
  fireEvent.click(within(confirmation).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("group")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete collection" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
  await screen.findByRole("heading", { name: "Make it yours" });
  expect(fetcher).toHaveBeenCalledWith(
    "/api/collections/weekend",
    expect.objectContaining({ method: "DELETE" }),
  );
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "DELETE"),
  ).toHaveLength(1);
});

test("rolls back optimistic membership and displays a useful mutation error", async () => {
  const fetcher = server(initial);
  const { client } = mount();
  const add = await screen.findByRole("button", {
    name: "Add A quiet story to Weekend",
  });
  let fail!: (response: Response) => void;
  fetcher.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        fail = resolve;
      }),
  );
  fireEvent.click(add);
  await screen.findByRole("button", {
    name: "Remove A quiet story from Weekend",
  });
  expect(
    client.getQueryData<Collection[]>(["collections"])?.[0].itemIds,
  ).toEqual([item.id]);
  fail(
    new Response(JSON.stringify({ error: "Please reconnect." }), {
      status: 503,
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not save your collection. Please reconnect.",
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Add A quiet story to Weekend" }),
    ).toBeEnabled(),
  );
  expect(
    client.getQueryData<Collection[]>(["collections"])?.[0].itemIds,
  ).toEqual([]);
});

test("shows loading and supports retrying a failed collection fetch", async () => {
  const fetcher = server(initial);
  fetcher.mockResolvedValueOnce(
    new Response(JSON.stringify({ error: "Connection lost." }), {
      status: 503,
    }),
  );
  mount();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Loading your collections",
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not load collections. Connection lost.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(
    await screen.findByRole("heading", { name: "Weekend" }),
  ).toBeInTheDocument();
});

test("keeps a failed creation name available to retry and removes the optimistic collection", async () => {
  const fetcher = server();
  mount();
  fireEvent.change(await screen.findByLabelText("New collection name"), {
    target: { value: "Weekend" },
  });
  fetcher.mockResolvedValueOnce(
    new Response(JSON.stringify({ error: "Name already exists." }), {
      status: 409,
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Create collection" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Name already exists.",
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Create collection" }),
    ).toBeEnabled(),
  );
  expect(screen.getByLabelText("New collection name")).toHaveValue("Weekend");
  expect(
    screen.getByRole("heading", { name: "Make it yours" }),
  ).toBeInTheDocument();
});

test("selects named collections and explains an empty library", async () => {
  server([...initial, { id: "favorites", name: "Favorites", itemIds: [] }]);
  mount([]);
  fireEvent.click(await screen.findByRole("button", { name: "Favorites 0" }));
  expect(
    screen.getByRole("heading", { name: "Favorites" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Favorites 0" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    screen.getByText(
      "Your library is empty. Save some items to your library to start collecting.",
    ),
  ).toBeInTheDocument();
});
