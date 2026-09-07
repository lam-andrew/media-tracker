import Link from "next/link";
import {
  BookOpen,
  Film,
  Tv,
  Gamepad2,
  Star,
  Sparkles,
  BarChart3,
  Upload,
  Lock,
  Search,
  Bookmark,
  NotebookPen,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { CoverWall } from "./cover-wall";
import { LibraryMock } from "./library-mock";

const SIGNUP = "/login?mode=signup";

export function LandingNav() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
      <Link
        href="/welcome"
        className="font-serif text-2xl font-medium tracking-tight text-ink"
      >
        {BRAND.name}
      </Link>
      <nav className="flex items-center gap-2.5" aria-label="Primary">
        <ThemeToggle />
        <Link
          href="/login"
          className="rounded-md px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-2"
        >
          Sign in
        </Link>
        <Link
          href={SIGNUP}
          className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-surface transition-colors hover:bg-accent-strong"
        >
          Get started
        </Link>
      </nav>
    </header>
  );
}

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-10 pt-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
      <div>
        <p className="flex flex-wrap items-center gap-x-2 text-xs uppercase tracking-widest text-muted">
          <span className="inline-flex items-center gap-1">
            <BookOpen size={13} /> Books
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            <Film size={13} /> Movies
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            <Tv size={13} /> TV
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            <Gamepad2 size={13} /> Games
          </span>
        </p>
        <h1 className="mt-5 font-serif text-4xl font-medium leading-[1.08] text-ink sm:text-5xl lg:text-6xl">
          Everything you&rsquo;ve read, watched, and played — on one shelf.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          {BRAND.name} is a personal catalog for your whole media life. Search
          any title, mark it, rate it, keep a note — and see it all in one
          place. No feeds, no followers. Just yours.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={SIGNUP}
            className="rounded-lg bg-accent px-5 py-3 text-sm font-medium text-surface transition-colors hover:bg-accent-strong"
          >
            Create your free account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border bg-surface px-5 py-3 text-sm text-ink transition-colors hover:border-border-strong"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">
          Free while in early access · Bring your Goodreads or Letterboxd
          history in minutes
        </p>
      </div>
      <CoverWall />
    </section>
  );
}

const FEATURES: {
  icon: typeof Star;
  title: string;
  body: string;
  wide?: boolean;
}[] = [
  {
    icon: BookOpen,
    title: "One shelf for every medium",
    body: "A novel, a series, a 60-hour RPG — same library, same half-star scale, same notes. The single-medium apps can't do this; that's the point.",
    wide: true,
  },
  {
    icon: Star,
    title: "Track it your way",
    body: "Want to / in progress / done / dropped, half-star ratings, progress in pages, episodes, or percent, and private notes on every item.",
  },
  {
    icon: Sparkles,
    title: "Recommendations with a reason",
    body: "“Because you loved Dune.” Picks drawn from what you rated highly — across media, not just within one.",
  },
  {
    icon: BarChart3,
    title: "Your year in numbers",
    body: "Completions by month, ratings spread, top genres, and a yearly goal with a bar that fills as you go.",
  },
  {
    icon: Upload,
    title: "Bring your history",
    body: "Import Goodreads and Letterboxd exports; each title is matched to its real entry with your ratings and dates intact.",
  },
  {
    icon: Lock,
    title: "Private by design",
    body: "No public profiles, no social graph, no algorithmic feed. Every row is yours, protected at the database, deletable in one click.",
  },
];

export function Features() {
  return (
    <section
      className="mx-auto max-w-6xl px-5 py-16 sm:py-24"
      aria-labelledby="features"
    >
      <p className="text-xs uppercase tracking-widest text-muted">
        What you get
      </p>
      <h2
        id="features"
        className="mt-2 max-w-2xl font-serif text-3xl text-ink sm:text-4xl"
      >
        A catalog that keeps up with how you actually consume things.
      </h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body, wide }) => (
          <article
            key={title}
            className={`flex flex-col rounded-2xl border border-border bg-surface p-6 ${
              wide ? "sm:col-span-2 lg:row-span-2" : ""
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-accent">
              <Icon size={19} />
            </span>
            <h3 className="mt-4 font-serif text-xl text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            {wide ? (
              <div className="mt-6">
                <LibraryMock />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: Search,
    title: "Search any title",
    body: "Books, movies, TV, and games from four sources, with real cover art and credits.",
  },
  {
    icon: Bookmark,
    title: "Mark it",
    body: "Add it as something you want, are in the middle of, or already finished — one tap.",
  },
  {
    icon: NotebookPen,
    title: "Come back to it",
    body: "Rate it, jot a note, log your progress. Your stats and recommendations grow from there.",
  },
];

export function HowItWorks() {
  return (
    <section
      className="border-y border-border bg-surface"
      aria-labelledby="how"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <p className="text-xs uppercase tracking-widest text-muted">
          How it works
        </p>
        <h2 id="how" className="mt-2 font-serif text-3xl text-ink sm:text-4xl">
          Three steps, then it&rsquo;s a habit.
        </h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent font-serif text-surface">
                {i + 1}
              </span>
              <div>
                <h3 className="flex items-center gap-2 font-serif text-lg text-ink">
                  <Icon size={16} className="text-accent" /> {title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FAQ = [
  {
    q: `Is ${BRAND.name} free?`,
    a: "Yes — it's free while in early access. If a paid tier ever arrives for power features, your library and the core catalog stay free.",
  },
  {
    q: "Is it a social network?",
    a: "No. There are no public profiles, followers, or feeds. It's a private catalog — a diary of what you've experienced, for you.",
  },
  {
    q: "Can I import what I already have?",
    a: "Yes. Export a CSV from Goodreads or Letterboxd and drop it in; each title is matched to its real entry with your ratings and dates.",
  },
  {
    q: "Where does the data come from?",
    a: "Book data from Open Library and Google Books; movies and TV from TMDB; games from RAWG with cover art via Steam. Descriptions and credits come with them.",
  },
  {
    q: "Can I delete everything?",
    a: "Any time. Settings → Delete account removes your account and every item in your library.",
  },
];

export function Faq() {
  return (
    <section
      className="mx-auto max-w-3xl px-5 py-16 sm:py-24"
      aria-labelledby="faq"
    >
      <h2 id="faq" className="font-serif text-3xl text-ink sm:text-4xl">
        Questions, answered.
      </h2>
      <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-surface">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-lg text-ink">
              {q}
              <span
                className="text-muted transition-transform group-open:rotate-45"
                aria-hidden="true"
              >
                +
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20">
      <div className="rounded-3xl border border-border bg-accent px-6 py-12 text-center sm:py-16">
        <h2 className="font-serif text-3xl text-surface sm:text-4xl">
          Start your shelf tonight.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-surface/85">
          Add the last thing you finished. That&rsquo;s all it takes to begin.
        </p>
        <Link
          href={SIGNUP}
          className="mt-7 inline-block rounded-lg bg-surface px-5 py-3 text-sm font-medium text-accent transition-colors hover:bg-bg"
        >
          Create your free account
        </Link>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-serif text-sm text-ink">{BRAND.name}</span> ·{" "}
          {BRAND.tagline}
        </p>
        <p className="max-w-xl sm:text-right">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB. Book data from Open Library and Google Books; game data from
          RAWG; game artwork via Steam.
        </p>
      </div>
    </footer>
  );
}
