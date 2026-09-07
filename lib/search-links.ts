/** Search URL for everything a person or studio made, within one media type. */
export function creatorHref(type: string, name: string): string {
  return `/search?type=${encodeURIComponent(type)}&creator=${encodeURIComponent(name)}`;
}

/** Detail preview for something not (yet) in the library. Ids may contain "/". */
export function mediaHref(type: string, externalId: string): string {
  return `/media/${encodeURIComponent(type)}/${encodeURIComponent(externalId)}`;
}
