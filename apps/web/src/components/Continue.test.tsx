import { afterEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { Continue } from "./Continue";
import type { LibraryItem } from "../types";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function entry(
  type = "book",
  current = 12,
  total: number | null = 100,
): LibraryItem {
  return {
    id: type,
    version: 3,
    source: "library",
    externalId: type,
    type,
    title: `My ${type}`,
    creators: ["A creator"],
    image: null,
    description: "",
    metadata: {},
    tracking: {
      status: "in_progress",
      current,
      total,
      rating: 4,
      favorite: true,
      notes: "Keep my notes",
      startedAt: "2026-09-01",
      season: 2,
    },
  };
}

test("omits the section when there are no in-progress items", () => {
  const item = entry();
  item.tracking.status = "completed";
  const { container } = render(
    <Continue items={[item]} open={vi.fn()} save={vi.fn()} />,
  );
  expect(container).toBeEmptyDOMElement();
});

test("shows at most six active items and opens their cached details", () => {
  const open = vi.fn();
  const backlog = entry();
  backlog.tracking.status = "backlog";
  const items = Array.from({ length: 8 }, (_, i) => ({
    ...entry(),
    id: `book-${i}`,
    title: `Story ${i}`,
  }));
  render(<Continue items={[backlog, ...items]} open={open} save={vi.fn()} />);
  expect(screen.getByRole("region", { name: "Continue" })).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(6);
  expect(
    screen.queryByRole("button", { name: "Open Story 6 details" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open Story 0 details" }));
  expect(open).toHaveBeenCalledWith(items[0]);
  expect(screen.getAllByText("Reading · 12 / 100 pages")).toHaveLength(6);
});

test.each([
  ["book", 12, 100, "+1 page", 13],
  ["tv", 2, null, "+1 episode", 3],
  ["game", 35, null, "+5%", 40],
  ["game", 98, null, "+5%", 100],
  ["game", 48, 50, "+5%", 50],
  ["game", 98, 200, "+5%", 100],
  ["book", 99, 100, "+1 page", 100],
] as const)(
  "advances %s from %s with total %s without losing tracking fields",
  async (type, current, total, label, next) => {
    const item = entry(type, current, total);
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <Continue items={[item]} open={vi.fn()} save={save} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: `${label} for ${item.title}` }),
    );
    expect(save).toHaveBeenCalledWith(item, {
      ...item.tracking,
      current: next,
    });
    await screen.findByText("Progress saved.");
    const updated = {
      ...item,
      version: 4,
      tracking: { ...item.tracking, current: next },
    };
    rerender(<Continue items={[updated]} open={vi.fn()} save={save} />);
    const cap =
      type === "game" ? Math.min(total ?? 100, 100) : (total ?? Infinity);
    if (next < cap) {
      fireEvent.click(
        screen.getByRole("button", { name: `${label} for ${item.title}` }),
      );
      expect(save).toHaveBeenLastCalledWith(updated, {
        ...updated.tracking,
        current: next + (type === "game" ? 5 : 1),
      });
      await screen.findByText("Progress saved.");
    }
  },
);

test.each([
  ["book", 100, 100],
  ["tv", 10, 10],
  ["game", 100, null],
  ["book", 101, 100],
] as const)(
  "does not advance %s at or above its total",
  (type, current, total) => {
    const save = vi.fn();
    render(
      <Continue
        items={[entry(type, current, total)]}
        open={vi.fn()}
        save={save}
      />,
    );
    const button = screen.getByRole("button", { name: /\+.* for/ });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(save).not.toHaveBeenCalled();
  },
);

test("keeps busy and failure feedback local, rolls back, and allows retry", async () => {
  const book = entry();
  const tv = entry("tv");
  let rejectSave!: (error: Error) => void;
  const save = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectSave = reject;
        }),
    )
    .mockResolvedValue(undefined);
  const open = vi.fn();
  render(<Continue items={[book, tv]} open={open} save={save} />);
  const button = screen.getByRole("button", { name: "+1 page for My book" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(save).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  expect(screen.getByText("Reading · 13 / 100 pages")).toBeInTheDocument();
  expect(screen.getByText("Saving progress…")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "+1 episode for My tv" }),
  ).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Open My book details" }));
  expect(open).toHaveBeenCalledWith(book);
  await act(async () => rejectSave(new Error("Offline")));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Couldn’t save progress. Try again.",
  );
  expect(screen.getByText("Reading · 12 / 100 pages")).toBeInTheDocument();
  expect(
    within(screen.getAllByRole("listitem")[1]).queryByRole("alert"),
  ).not.toBeInTheDocument();
  expect(button).toBeEnabled();
  fireEvent.click(button);
  await screen.findByText("Progress saved.");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(save).toHaveBeenLastCalledWith(book, {
    ...book.tracking,
    current: 13,
  });
});

test.each([["movie", "Update progress"]])(
  "delegates %s updates to details without a progress save",
  (type, action) => {
    const item = entry(type);
    const open = vi.fn();
    const save = vi.fn();
    render(<Continue items={[item]} open={open} save={save} />);
    fireEvent.click(
      screen.getByRole("button", { name: `${action} for ${item.title}` }),
    );
    expect(open).toHaveBeenCalledWith(item);
    expect(save).not.toHaveBeenCalled();
  },
);

test.each([undefined, 4])(
  "logs a board-game play from count %s and preserves tracking",
  async (playCount) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-02T12:00:00Z"));
    const item = entry("boardgame");
    item.tracking = {
      ...item.tracking,
      owned: true,
      playCount,
      lastPlayedAt: "2026-09-01",
    };
    const save = vi.fn().mockResolvedValue(undefined);
    render(<Continue items={[item]} open={vi.fn()} save={save} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Log a play for My boardgame" }),
    );
    expect(save).toHaveBeenCalledWith(item, {
      ...item.tracking,
      playCount: (playCount ?? 0) + 1,
      lastPlayedAt: "2026-10-02",
    });
    await screen.findByText("Play logged.");
  },
);

test("failed play logging preserves the old count and date", async () => {
  const item = entry("boardgame");
  item.tracking.playCount = 2;
  item.tracking.lastPlayedAt = "2026-09-01";
  const save = vi.fn().mockRejectedValue(new Error("Offline"));
  render(<Continue items={[item]} open={vi.fn()} save={save} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Log a play for My boardgame" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Couldn’t log play. Try again.",
  );
  expect(screen.getByText(/ · 2 plays$/)).toBeInTheDocument();
  expect(item.tracking.lastPlayedAt).toBe("2026-09-01");
  expect(
    screen.getByRole("button", { name: "Log a play for My boardgame" }),
  ).toBeEnabled();
});

test("parent busy disables all quick actions while details stay available", () => {
  const items = [entry(), entry("boardgame"), entry("movie")];
  const save = vi.fn();
  const open = vi.fn();
  const { rerender } = render(
    <Continue items={items} open={open} save={save} busy />,
  );
  for (const name of [
    "+1 page for My book",
    "Log a play for My boardgame",
    "Update progress for My movie",
  ]) {
    const button = screen.getByRole("button", { name });
    expect(button).toBeDisabled();
    fireEvent.click(button);
  }
  expect(save).not.toHaveBeenCalled();
  expect(open).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Open My boardgame details" }),
  );
  expect(open).toHaveBeenCalledWith(items[1]);
  rerender(<Continue items={items} open={open} save={save} busy={false} />);
  expect(
    screen.getByRole("button", { name: "Log a play for My boardgame" }),
  ).toBeEnabled();
});

test("orders by recent activity before taking six without mutating the library", () => {
  const items = Array.from({ length: 7 }, (_, i) => ({
    ...entry(),
    id: `book-${i}`,
    title: `Story ${i}`,
    updatedAt: `2026-09-0${i + 1}T12:00:00Z`,
  }));
  render(<Continue items={items} open={vi.fn()} save={vi.fn()} />);
  expect(
    within(screen.getAllByRole("listitem")[0]).getByRole("button", {
      name: "Open Story 6 details",
    }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Open Story 0 details" }),
  ).not.toBeInTheDocument();
  expect(items[0].title).toBe("Story 0");
});
test("a quick update does not move cards under the pointer", () => {
  const first = { ...entry("book"), updatedAt: "2026-10-02T10:00:00Z" };
  const second = { ...entry("tv"), updatedAt: "2026-10-01T10:00:00Z" };
  const props = { open: vi.fn(), save: vi.fn() };
  const { rerender } = render(<Continue items={[first, second]} {...props} />);
  rerender(
    <Continue
      items={[first, { ...second, updatedAt: "2026-10-03T10:00:00Z" }]}
      {...props}
    />,
  );
  const cards = screen.getAllByRole("listitem");
  expect(
    within(cards[0]).getByRole("button", { name: "Open My book details" }),
  ).toBeInTheDocument();
  expect(
    within(cards[1]).getByRole("button", { name: "Open My tv details" }),
  ).toBeInTheDocument();
});
