import { parseRichText } from "../../../../packages/contracts/src/rich-text";
export function RichText({ text }: { text: string }) {
  return (
    <div className="description">
      {parseRichText(text).map((p, i) => (
        <p key={i}>
          {p.map((n, j) =>
            n.kind === "br" ? (
              <br key={j} />
            ) : n.kind === "strong" ? (
              <strong key={j}>{n.text}</strong>
            ) : n.kind === "em" ? (
              <em key={j}>{n.text}</em>
            ) : (
              <span key={j}>{n.text}</span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}
