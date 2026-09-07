import { describe, it, expect } from "vitest";
import { creatorHref, mediaHref } from "./search-links";

describe("search links", () => {
  it("encodes creator names", () => {
    expect(creatorHref("book", "Ursula K. Le Guin")).toBe(
      "/search?type=book&creator=Ursula%20K.%20Le%20Guin",
    );
  });
  it("keeps slash-bearing ids (Open Library work keys) in one segment", () => {
    expect(mediaHref("book", "/works/OL45804W")).toBe(
      "/media/book/%2Fworks%2FOL45804W",
    );
    expect(mediaHref("game", "3498")).toBe("/media/game/3498");
  });
});
