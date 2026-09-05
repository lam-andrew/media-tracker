import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { LibraryItem } from "@/lib/queries";
import { LibraryBrowser } from "./library-browser";

// The real grid needs next/image, next/link and the toast provider; the browser's
// behavior is about which items reach it, so stub it to a plain list.
vi.mock("./library-grid", () => ({
  LibraryGrid: ({ items }: { items: LibraryItem[] }) => (
    <ul data-testid="grid">
      {items.map((i) => (
        <li key={i.id}>{i.title}</li>
      ))}
    </ul>
  ),
}));

function mk(over: Partial<LibraryItem> & { id: string }): LibraryItem {
  return {
    status: "backlog",
    rating: null,
    favorite: false,
    mediaItemId: `m-${over.id}`,
    type: "book",
    title: over.id,
    imageUrl: null,
    releaseYear: null,
    creators: [],
    ...over,
  };
}

const items = [
  mk({ id: "Dune", rating: 5, status: "completed", creators: ["Herbert"] }),
  mk({ id: "Alien", rating: 3, status: "backlog", creators: ["Scott"] }),
  mk({ id: "Blade Runner", status: "in_progress" }),
];

const shown = () =>
  Array.from(screen.getByTestId("grid").querySelectorAll("li")).map(
    (li) => li.textContent,
  );

beforeEach(() => {
  window.history.replaceState(null, "", "/library");
});

describe("LibraryBrowser", () => {
  it("shows everything by default in added order", () => {
    render(<LibraryBrowser items={items} basePath="/library" />);
    expect(shown()).toEqual(["Dune", "Alien", "Blade Runner"]);
  });

  it("filters by status chip and mirrors it into the URL without navigating", () => {
    render(<LibraryBrowser items={items} basePath="/library" type="book" />);
    fireEvent.click(screen.getByRole("button", { name: "Read" })); // book label for completed
    expect(shown()).toEqual(["Dune"]);
    expect(window.location.search).toBe("?type=book&status=completed");
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });

  it("sorts by rating with unrated last", () => {
    render(<LibraryBrowser items={items} basePath="/library" />);
    fireEvent.change(screen.getByLabelText("Sort by"), {
      target: { value: "rating" },
    });
    expect(shown()).toEqual(["Dune", "Alien", "Blade Runner"]);
    expect(window.location.search).toBe("?sort=rating");
  });

  it("text-filters on title or creator and reports no matches", () => {
    render(<LibraryBrowser items={items} basePath="/library" />);
    const box = screen.getByLabelText("Filter by title or creator");
    fireEvent.change(box, { target: { value: "scott" } });
    expect(shown()).toEqual(["Alien"]);
    fireEvent.change(box, { target: { value: "zzz" } });
    expect(screen.getByText(/No items match/)).toBeInTheDocument();
  });

  it("seeds status and sort from the URL-derived props", () => {
    render(
      <LibraryBrowser
        items={items}
        basePath="/library"
        initialStatus="backlog"
        initialSort="title"
      />,
    );
    expect(shown()).toEqual(["Alien"]);
    expect(screen.getByRole("button", { name: "Backlog" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
