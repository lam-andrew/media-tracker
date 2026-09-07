import { describe, it, expect } from "vitest";
import { parseRichText, toPlainText } from "./rich-text";

describe("parseRichText", () => {
  it("renders markdown emphasis and strong from Open Library text", () => {
    const [p] = parseRichText("fuse with a *Cor* Heart and **never** stop");
    expect(p).toEqual([
      { kind: "text", text: "fuse with a " },
      { kind: "em", text: "Cor" },
      { kind: "text", text: " Heart and " },
      { kind: "strong", text: "never" },
      { kind: "text", text: " stop" },
    ]);
  });

  it("splits paragraphs on blank lines, incl. CRLF, and keeps single breaks", () => {
    const ps = parseRichText("one\r\n\r\ntwo\nstill two");
    expect(ps).toHaveLength(2);
    expect(ps[1]).toEqual([
      { kind: "text", text: "two" },
      { kind: "br" },
      { kind: "text", text: "still two" },
    ]);
  });

  it("converts the HTML subset and strips everything else, decoding entities", () => {
    const ps = parseRichText(
      "<p>A <b>bold</b> &amp; <i>quiet</i> tale<br>here</p><p><span>next</span> &#39;x&#39;</p>",
    );
    expect(
      toPlainText("<p>A <b>bold</b> &amp; <i>quiet</i> tale<br>here</p>"),
    ).toBe("A bold & quiet tale\nhere");
    expect(ps[0].some((n) => n.kind === "strong" && n.text === "bold")).toBe(
      true,
    );
    expect(ps[1]).toEqual([{ kind: "text", text: "next 'x'" }]);
  });

  it("does not treat underscores inside words as emphasis", () => {
    expect(toPlainText("snake_case_name and _real_")).toBe(
      "snake_case_name and real",
    );
  });

  it("handles empty input", () => {
    expect(parseRichText(null)).toEqual([]);
    expect(parseRichText("   ")).toEqual([]);
  });
});
