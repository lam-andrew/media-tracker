/** Search URL for everything a person or studio made, within one media type. */
export function creatorHref(type: string, name: string): string {
  return `/search?type=${encodeURIComponent(type)}&creator=${encodeURIComponent(name)}`;
}
