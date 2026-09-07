/**
 * Real cover art for the landing page, gathered from the same public sources the
 * app uses (Open Library, TMDB, Steam). Decorative only — never persisted.
 */

export interface SampleCover {
  type: string;
  title: string;
  by: string;
  image: string;
}

export const COVERS: SampleCover[] = [
  {
    type: "book",
    title: "Dune",
    by: "Frank Herbert",
    image: "https://covers.openlibrary.org/b/id/11481354-L.jpg",
  },
  {
    type: "book",
    title: "Project Hail Mary",
    by: "Andy Weir",
    image: "https://covers.openlibrary.org/b/id/11200092-L.jpg",
  },
  {
    type: "book",
    title: "Piranesi",
    by: "Susanna Clarke",
    image: "https://covers.openlibrary.org/b/id/10226290-L.jpg",
  },
  {
    type: "book",
    title: "Circe",
    by: "Madeline Miller",
    image: "https://covers.openlibrary.org/b/id/8739376-L.jpg",
  },
  {
    type: "book",
    title: "The Name of the Wind",
    by: "Patrick Rothfuss",
    image: "https://covers.openlibrary.org/b/id/11480483-L.jpg",
  },
  {
    type: "book",
    title: "Klara and the Sun",
    by: "Kazuo Ishiguro",
    image: "https://covers.openlibrary.org/b/id/10648686-L.jpg",
  },
  {
    type: "book",
    title: "Pachinko",
    by: "Min Jin Lee",
    image: "https://covers.openlibrary.org/b/id/8044605-L.jpg",
  },
  {
    type: "book",
    title: "The Left Hand of Darkness",
    by: "Ursula K. Le Guin",
    image: "https://covers.openlibrary.org/b/id/10618463-L.jpg",
  },
  {
    type: "movie",
    title: "Inception",
    by: "2010",
    image: "https://image.tmdb.org/t/p/w500/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg",
  },
  {
    type: "movie",
    title: "Spirited Away",
    by: "2001",
    image: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
  },
  {
    type: "movie",
    title: "Parasite",
    by: "2019",
    image: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
  },
  {
    type: "movie",
    title: "Blade Runner 2049",
    by: "2017",
    image: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
  },
  {
    type: "movie",
    title: "Everything Everywhere All at Once",
    by: "2022",
    image: "https://image.tmdb.org/t/p/w500/u68AjlvlutfEIcpmbYpKcdi09ut.jpg",
  },
  {
    type: "movie",
    title: "Dune: Part Two",
    by: "2024",
    image: "https://image.tmdb.org/t/p/w500/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg",
  },
  {
    type: "tv",
    title: "Severance",
    by: "2022",
    image: "https://image.tmdb.org/t/p/w500/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg",
  },
  {
    type: "tv",
    title: "The Bear",
    by: "2022",
    image: "https://image.tmdb.org/t/p/w500/eKfVzzEazSIjJMrw9ADa2x8ksLz.jpg",
  },
  {
    type: "tv",
    title: "Breaking Bad",
    by: "2008",
    image: "https://image.tmdb.org/t/p/w500/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg",
  },
  {
    type: "tv",
    title: "Andor",
    by: "2022",
    image: "https://image.tmdb.org/t/p/w500/khZqmwHQicTYoS7Flreb9EddFZC.jpg",
  },
  {
    type: "game",
    title: "Portal 2",
    by: "",
    image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/620/library_600x900.jpg",
  },
  {
    type: "game",
    title: "Hades",
    by: "",
    image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/library_600x900.jpg",
  },
  {
    type: "game",
    title: "Elden Ring",
    by: "",
    image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_600x900.jpg",
  },
  {
    type: "game",
    title: "Stardew Valley",
    by: "",
    image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/413150/library_600x900.jpg",
  },
  {
    type: "game",
    title: "Celeste",
    by: "",
    image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/504230/library_600x900.jpg",
  },
  {
    type: "game",
    title: "Hollow Knight",
    by: "",
    image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/367520/library_600x900.jpg",
  },
];

/** A believable slice of a library for the feature mock: status + rating per item. */
export const LIBRARY_MOCK: (SampleCover & {
  status: string;
  rating: number | null;
})[] = [
  { ...COVERS[0], status: "Read", rating: 5 },
  { ...COVERS[14], status: "Watching", rating: null },
  { ...COVERS[9], status: "Watched", rating: 4.5 },
  { ...COVERS[19], status: "Played", rating: 5 },
  { ...COVERS[3], status: "Reading", rating: null },
  { ...COVERS[12], status: "Want to watch", rating: null },
];
