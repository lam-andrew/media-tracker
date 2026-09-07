import { describe, it, expect } from "vitest";
import { deriveDetailInfo } from "./media-detail";

describe("deriveDetailInfo credits", () => {
  it("groups movie credits by role when the provider supplied them", () => {
    const d = deriveDetailInfo(
      "movie",
      { directors: ["Christopher Nolan"], cast: ["Leo", "JGL"] },
      ["Christopher Nolan", "Leo"],
    );
    expect(d.credits).toEqual([
      { label: "Directed by", names: ["Christopher Nolan"] },
      { label: "Starring", names: ["Leo", "JGL"] },
    ]);
  });

  it("falls back to a plain 'By' line from the stored creators", () => {
    expect(deriveDetailInfo("book", {}, ["Andrew Givler"]).credits).toEqual([
      { label: "By", names: ["Andrew Givler"] },
    ]);
    expect(deriveDetailInfo("movie", {}, []).credits).toEqual([]);
  });
});
