import Image from "next/image";

/**
 * A cover/poster image. Uses next/image so covers are resized to what's actually
 * displayed, lazy-loaded, and cached (instead of shipping full-size art). Renders
 * a titled placeholder when there's no image. The PARENT must be positioned
 * (relative) and sized, since this fills it.
 */
export function Cover({
  src,
  title,
  sizes,
  priority = false,
}: {
  src: string | null;
  title: string;
  sizes: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <span className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-muted">
        {title}
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
    />
  );
}
