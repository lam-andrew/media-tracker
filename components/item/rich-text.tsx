import { Fragment } from "react";
import { parseRichText } from "@/lib/rich-text";

/**
 * Renders a provider description (markdown-ish or HTML) as formatted text via a
 * safe node tree — no dangerouslySetInnerHTML. Paragraphs are joined inside one
 * <p> so a parent `line-clamp-*` still applies.
 */
export function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const paragraphs = parseRichText(text);
  return (
    <p className={className}>
      {paragraphs.map((nodes, pi) => (
        <Fragment key={pi}>
          {pi > 0 ? (
            <>
              <br />
              <br />
            </>
          ) : null}
          {nodes.map((n, i) =>
            n.kind === "br" ? (
              <br key={i} />
            ) : n.kind === "strong" ? (
              <strong key={i} className="font-medium text-ink">
                {n.text}
              </strong>
            ) : n.kind === "em" ? (
              <em key={i}>{n.text}</em>
            ) : (
              <Fragment key={i}>{n.text}</Fragment>
            ),
          )}
        </Fragment>
      ))}
    </p>
  );
}
