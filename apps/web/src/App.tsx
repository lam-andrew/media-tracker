import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, Search, Plus, LogOut, ArrowUpRight } from "lucide-react";
import { api, ApiError } from "./api";
import {
  BRAND,
  mediaConfig,
  mediaKey,
  type User,
  type Media,
  type LibraryItem,
  type Tracking,
} from "./types";
import { Auth } from "./components/Auth";
import { Room } from "./components/Room";
import { Gallery } from "./components/Gallery";
import { Detail } from "./components/Detail";
import { Cover } from "./components/Cover";
import { Insights } from "./components/Insights";
import { Discover } from "./components/Discover";
import { Import } from "./components/Import";
import { Settings } from "./components/Settings";
import { themeStyle } from "./theme";
const views = [
  "Room",
  "Gallery",
  "Favorites",
  "Journal",
  "Discover",
  "Search",
  "Stats",
  "Import",
  "Settings",
];
const initialView = () => {
  const name = decodeURIComponent(window.location.pathname.slice(1));
  return views.find((v) => v.toLowerCase() === name) || "Room";
};
export default function App() {
  const qc = useQueryClient();
  const [routeRevision, setRouteRevision] = useState(0);
  const recoveryLink = /^#(reset|verify)=/.test(window.location.hash);
  const [view, setView] = useState(initialView),
    [query, setQuery] = useState(
      new URLSearchParams(window.location.search).get("q") ?? "",
    ),
    [searchTerm, setSearchTerm] = useState(""),
    [dusk, setDusk] = useState(localStorage.getItem("marqd-dusk") === "true"),
    [selected, setSelected] = useState<Media | null>(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [mediaType, setMediaType] = useState("book"),
    [filterType, setFilterType] = useState("all"),
    [status, setStatus] = useState("all"),
    [sort, setSort] = useState("added"),
    [creator, setCreator] = useState(false),
    [limit, setLimit] = useState(48),
    [palette, setPalette] = useState(
      localStorage.getItem("marqd-palette") || "Terracotta",
    );
  useEffect(() => {
    localStorage.setItem("marqd-dusk", String(dusk));
    localStorage.setItem("marqd-palette", palette);
  }, [dusk, palette]);
  useEffect(() => {
    const pop = () => {
      setView(initialView());
      setSelected(null);
      setRouteRevision((n) => n + 1);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => setLimit(48), [query, status, sort, filterType, view]);
  const config = useQuery({
    queryKey: ["config"],
    queryFn: () => api<{ providers: Record<string, boolean> }>("/config"),
    staleTime: 300000,
  });
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api<{ user: User | null }>("/session"),
    retry: false,
    staleTime: 300000,
  });
  const user = session.data?.user;
  const library = useQuery({
    queryKey: ["library", user?.id],
    queryFn: () => api<LibraryItem[]>("/library"),
    enabled: !!user,
    staleTime: 60000,
  });
  const items = library.data ?? [];
  const key = ["library", user?.id];
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2300);
    return () => clearTimeout(t);
  }, [toast]);
  const results = useQuery({
    queryKey: ["search", mediaType, creator, searchTerm],
    queryFn: ({ signal }) =>
      api<Media[]>(
        `/search?type=${mediaType}&q=${encodeURIComponent(searchTerm)}${creator ? "&creator=1" : ""}`,
        { signal },
      ),
    enabled: !!user && view === "Search" && searchTerm.length >= 2,
    staleTime: 300000,
    retry: false,
  });
  const add = useMutation({
    mutationFn: ({ m, status }: { m: Media; status: Tracking["status"] }) =>
      api<LibraryItem>("/library", {
        method: "POST",
        body: JSON.stringify({
          source: m.source,
          type: m.type,
          externalId: m.externalId,
          status,
        }),
      }),
    onSuccess: (item) => {
      qc.setQueryData<LibraryItem[]>(key, (old) => [
        item,
        ...(old ?? []).filter((i) => i.id !== item.id),
      ]);
      closeDetail();
      setToast("A new story in your collection.");
    },
    onError: (e) => setError(e.message),
  });
  const save = useMutation({
    mutationFn: ({
      item,
      tracking,
    }: {
      item: LibraryItem;
      tracking: Tracking;
    }) =>
      api<LibraryItem>(`/library/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ version: item.version, tracking }),
      }),
    onMutate: async ({ item, tracking }) => {
      setError("");
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<LibraryItem[]>(key);
      qc.setQueryData<LibraryItem[]>(key, (old) =>
        old?.map((m) => (m.id === item.id ? { ...m, tracking } : m)),
      );
      return { previous };
    },
    onError: (e, _v, context) => {
      qc.setQueryData(key, context?.previous);
      setError(e.message);
      if (e instanceof ApiError && e.status === 409)
        void qc.invalidateQueries({ queryKey: key });
    },
    onSuccess: (item) => {
      qc.setQueryData<LibraryItem[]>(key, (old) =>
        old?.map((m) => (m.id === item.id ? item : m)),
      );
      closeDetail();
      setToast("Your story, updated.");
    },
  });
  const filtered = items
    .filter(
      (m) =>
        (filterType === "all" || m.type === filterType) &&
        (status === "all" || m.tracking.status === status) &&
        (view !== "Favorites" || m.tracking.favorite) &&
        (m.title + " " + m.creators.join(" "))
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "rating"
          ? (b.tracking.rating ?? 0) - (a.tracking.rating ?? 0)
          : sort === "year"
            ? Number(b.metadata.year ?? 0) - Number(a.metadata.year ?? 0)
            : 0,
    );
  function resetSession() {
    setSelected(null);
    qc.clear();
    qc.setQueryData(["session"], { user: null });
    navigate("Room");
  }
  function closeDetail() {
    setSelected(null);
    const u = new URL(window.location.href);
    u.searchParams.delete("item");
    window.history.replaceState({}, "", u.pathname + u.search + u.hash);
  }
  function open(m: Media) {
    setError("");
    setSelected(m);
    if ("id" in m) {
      const u = new URL(window.location.href);
      u.searchParams.set("item", String(m.id));
      window.history.pushState({}, "", u.pathname + u.search);
    }
  }
  function navigate(n: string) {
    setView(n);
    document
      .querySelector<HTMLDetailsElement>(".profile-menu")
      ?.removeAttribute("open");
    window.history.pushState(
      {},
      "",
      n === "Room" ? "/" : "/" + n.toLowerCase(),
    );
    setCreator(false);
    setQuery("");
    setSearchTerm("");
  }
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("item");
    if (id && library.data && !selected) {
      const item = library.data.find((i) => i.id === id);
      if (item) setSelected(item);
    }
  }, [library.data, routeRevision]);
  const owned = selected
    ? items.find((i) => mediaKey(i) === mediaKey(selected))
    : undefined;
  return (
    <main
      className={dusk ? "world dusk" : "world"}
      style={themeStyle(palette, dusk) as React.CSSProperties}
    >
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <div className="study-bar">
        <span>V2 DEVELOPMENT · SEPARATE LIBRARY</span>
        <span>THE READING ROOM</span>
      </div>
      <header>
        <button className="brand" onClick={() => navigate("Room")}>
          {BRAND.name.toLowerCase()}
          <span>✳</span>
        </button>
        {user && (
          <nav aria-label="Main navigation">
            {["Library", "Discover", "Journal"].map((n) => (
              <button
                key={n}
                className={
                  (
                    n === "Library"
                      ? ["Room", "Gallery", "Favorites"].includes(view)
                      : n === "Discover"
                        ? ["Discover", "Search"].includes(view)
                        : ["Journal", "Stats"].includes(view)
                  )
                    ? "chosen"
                    : ""
                }
                onClick={() => navigate(n === "Library" ? "Room" : n)}
              >
                {n}
              </button>
            ))}
          </nav>
        )}
        <div className="header-tools">
          {user && (
            <button
              className="round"
              aria-label="Search"
              onClick={() => navigate("Search")}
            >
              <Search size={18} />
            </button>
          )}
          {user && (
            <details className="profile-menu">
              <summary aria-label="Profile menu">
                {user.email.split("@")[0]}
              </summary>
              <div className="glass">
                <p>{user.email}</p>
                <button onClick={() => navigate("Settings")}>
                  Profile & settings
                </button>
                <button onClick={() => navigate("Import")}>
                  Import library
                </button>
                <a href="/api/export" download>
                  Export library
                </a>
                {user && (
                  <button
                    className="sign-out"
                    aria-label="Sign out"
                    onClick={async () => {
                      try {
                        await api("/logout", { method: "POST" });
                        setSelected(null);
                        await qc.cancelQueries();
                        qc.clear();
                        qc.setQueryData(["session"], { user: null });
                        setToast("");
                        setError("");
                        navigate("Room");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                )}
              </div>
            </details>
          )}
          <button
            className="round"
            aria-label={dusk ? "Switch to daylight" : "Switch to evening"}
            onClick={() => setDusk(!dusk)}
          >
            {dusk ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <section className={view === "Room" ? "intro" : "intro compact-intro"}>
        <div className="eyebrow">
          <span />
          YOUR OWN LITTLE CORNER OF THE WORLD
        </div>
        <h1>
          {view === "Search" ? (
            <>
              Find your <em>next world.</em>
            </>
          ) : view !== "Room" ? (
            (
              {
                Gallery: "Your collection.",
                Favorites: "The ones you love.",
                Journal: "Your story so far.",
                Stats: "A little perspective.",
                Settings: "Make yourself at home.",
                Import: "Bring your stories.",
                Discover: "Your next obsession.",
              } as Record<string, string>
            )[view]
          ) : (
            <>
              A room of <em>your own.</em>
            </>
          )}
        </h1>
        <p>
          {view === "Search"
            ? "Books, movies, shows, and games. Your next story starts here."
            : "For the stories you’re in. And the ones you’ll never quite leave."}
        </p>
      </section>
      {user && ["Journal", "Stats", "Discover", "Search"].includes(view) && (
        <div className="workspace-tabs" aria-label="Section navigation">
          {(["Journal", "Stats"].includes(view)
            ? ["Journal", "Stats"]
            : ["Discover", "Search"]
          ).map((n) => (
            <button
              key={n}
              aria-pressed={view === n}
              onClick={() => navigate(n)}
            >
              {n === "Stats"
                ? "Insights & goals"
                : n === "Discover"
                  ? "For you"
                  : n === "Search"
                    ? "Search catalog"
                    : n}
            </button>
          ))}
        </div>
      )}
      {session.isPending ? (
        <p className="loading" role="status">
          Opening your room…
        </p>
      ) : !user || recoveryLink ? (
        recoveryLink ||
        session.data?.user === null ||
        (session.error instanceof ApiError && session.error.status === 401) ? (
          <Auth onSuccess={(u) => qc.setQueryData(["session"], { user: u })} />
        ) : (
          <div className="loading">
            <p role="alert">Unable to reach your library.</p>
            <button className="primary" onClick={() => session.refetch()}>
              Try again
            </button>
          </div>
        )
      ) : (
        <>
          <div id="content" tabIndex={-1} />
          {["Room", "Gallery", "Favorites"].includes(view) && (
            <div className="collection-heading">
              <div>
                <h2>Your library</h2>
                <span>
                  {filtered.length} of {items.length} stories
                </span>
              </div>
              <div className="workspace-tabs" aria-label="Library views">
                {["Room", "Gallery", "Favorites"].map((n) => (
                  <button
                    key={n}
                    aria-pressed={view === n}
                    onClick={() => navigate(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="collection-controls">
            {["Room", "Gallery", "Favorites", "Search"].includes(view) && (
              <div className="toolbar glass">
                <span className="eyebrow toolbar-label">
                  {view === "Search"
                    ? "DISCOVER STORIES"
                    : `${items.length} STORIES`}
                </span>
                <label className="search">
                  <Search size={15} />
                  <input
                    aria-label={
                      view === "Search"
                        ? `Search ${mediaConfig[mediaType].label.toLowerCase()}`
                        : "Filter library"
                    }
                    value={query}
                    maxLength={150}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      view === "Search"
                        ? "Title, author, or ISBN…"
                        : "Find a story…"
                    }
                  />
                </label>
                <button className="add" onClick={() => navigate("Search")}>
                  <Plus size={16} />
                  Add a story
                </button>
              </div>
            )}
            {view === "Search" && (
              <div className="filters">
                <label>
                  Media type
                  <select
                    value={mediaType}
                    onChange={(e) => {
                      setMediaType(e.target.value);
                      setCreator(false);
                    }}
                  >
                    {Object.entries(mediaConfig).map(([t, c]) => (
                      <option key={t} value={t}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={creator}
                    onChange={(e) => setCreator(e.target.checked)}
                  />{" "}
                  Search by creator
                </label>
                {config.data?.providers?.[mediaType] === false && (
                  <p role="status">
                    This catalog needs an API key in the server configuration.
                  </p>
                )}
              </div>
            )}
            {["Gallery", "Favorites", "Room"].includes(view) && (
              <div className="filters">
                <label>
                  Type
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All media</option>
                    {Object.entries(mediaConfig).map(([t, c]) => (
                      <option value={t} key={t}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="all">Any status</option>
                    <option value="backlog">Planned</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="abandoned">Stopped</option>
                  </select>
                </label>
                <label>
                  Sort
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="added">Recently added</option>
                    <option value="title">Title</option>
                    <option value="rating">Rating</option>
                    <option value="year">Release year</option>
                  </select>
                </label>
              </div>
            )}
          </div>
          {error && !selected && (
            <p role="alert" className="error loading">
              {error}
            </p>
          )}
          {view === "Settings" ? (
            <Settings
              dusk={dusk}
              setDusk={setDusk}
              palette={palette}
              setPalette={setPalette}
              onDeleted={resetSession}
            />
          ) : view === "Import" ? (
            <Import />
          ) : view === "Stats" ? (
            <Insights items={items} />
          ) : view === "Discover" ? (
            <Discover items={items} open={open} />
          ) : library.isError ? (
            <div className="loading">
              <p role="alert">We couldn’t load your library.</p>
              <button onClick={() => library.refetch()}>Retry</button>
            </div>
          ) : view === "Search" ? (
            <>
              <div className="search-status" role="status">
                {query.trim().length < 2
                  ? "Enter at least two characters to search."
                  : query.trim() !== searchTerm || results.isFetching
                    ? "Finding your next story…"
                    : results.isError
                      ? (results.error as Error).message
                      : `${results.data?.length ?? 0} results found`}
              </div>
              {query.trim() === searchTerm && searchTerm.length >= 2 && (
                <Gallery items={results.data ?? []} open={open} owned={items} />
              )}
            </>
          ) : library.isPending ? (
            <div className="room skeleton" aria-label="Loading library" />
          ) : view === "Room" ? (
            <Room
              items={filtered}
              dusk={dusk}
              open={open}
              onAdd={() => navigate("Search")}
            />
          ) : ["Gallery", "Favorites"].includes(view) ? (
            filtered.length ? (
              <>
                <Gallery
                  items={filtered.slice(0, limit)}
                  open={open}
                  owned={items}
                />
                {filtered.length > limit && (
                  <button
                    className="primary load-more"
                    onClick={() => setLimit(limit + 48)}
                  >
                    Show more ({filtered.length - limit} remaining)
                  </button>
                )}
              </>
            ) : (
              <div className="loading">
                No stories here yet.{" "}
                <button className="primary" onClick={() => navigate("Search")}>
                  Find a story
                </button>
              </div>
            )
          ) : (
            <section className="journal">
              {items.length === 0 ? (
                <p>Your journal begins with your first story.</p>
              ) : (
                items.map((m, i) => (
                  <button
                    className="journal-entry"
                    key={m.id}
                    onClick={() => open(m)}
                  >
                    <span className="entry-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Cover item={m} />
                    <div>
                      <h2>{m.title}</h2>
                      <p>
                        {m.tracking.notes ||
                          "What stayed with you? Leave a thought."}
                      </p>
                    </div>
                    <ArrowUpRight size={20} />
                  </button>
                ))
              )}
            </section>
          )}
        </>
      )}
      <footer>
        <span className="brand">
          {BRAND.name.toLowerCase()}
          <span>✳</span>
        </span>
        <p>
          A collection of stories.
          <br />A reflection of you.
        </p>
        <span>
          V2 · ALL YOUR STORIES
          <br />
          Your original library is unchanged.
        </span>
      </footer>
      {selected && (
        <Detail
          key={mediaKey(selected)}
          media={selected}
          item={owned}
          close={() => {
            setSelected(null);
            const u = new URL(window.location.href);
            u.searchParams.delete("item");
            window.history.replaceState({}, "", u.pathname + u.search);
          }}
          byCreator={(name) => {
            setSelected(null);
            navigate("Search");
            setMediaType(selected.type);
            setCreator(true);
            setQuery(name);
          }}
          remove={async (item) => {
            try {
              await api("/library/" + item.id, { method: "DELETE" });
              qc.setQueryData<LibraryItem[]>(key, (old) =>
                old?.filter((m) => m.id !== item.id),
              );
              setSelected(null);
              setToast("Removed from your collection.");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
          busy={save.isPending || add.isPending}
          error={error}
          add={async (m, status) => {
            setError("");
            await add.mutateAsync({ m, status }).catch(() => {});
          }}
          save={async (item, tracking) => {
            await save.mutateAsync({ item, tracking }).catch(() => {});
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
