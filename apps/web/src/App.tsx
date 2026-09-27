import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, Search, Plus, LogOut, ArrowUpRight } from "lucide-react";
import { api, ApiError } from "./api";
import {
  BRAND,
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
export default function App() {
  const qc = useQueryClient();
  const [view, setView] = useState("Room"),
    [query, setQuery] = useState(""),
    [searchTerm, setSearchTerm] = useState(""),
    [dusk, setDusk] = useState(false),
    [selected, setSelected] = useState<Media | null>(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
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
    queryKey: ["search", searchTerm],
    queryFn: ({ signal }) =>
      api<Media[]>(`/search?q=${encodeURIComponent(searchTerm)}`, { signal }),
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
          externalId: m.externalId,
          status,
        }),
      }),
    onSuccess: (item) => {
      qc.setQueryData<LibraryItem[]>(key, (old) => [
        item,
        ...(old ?? []).filter((i) => i.id !== item.id),
      ]);
      setSelected(null);
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
      setSelected(null);
      setToast("Your story, updated.");
    },
  });
  const filtered = items.filter((m) =>
    m.title.toLowerCase().includes(query.toLowerCase()),
  );
  function open(m: Media) {
    setError("");
    setSelected(m);
  }
  function navigate(n: string) {
    setView(n);
    setQuery("");
    setSearchTerm("");
  }
  const owned = selected
    ? items.find((i) => mediaKey(i) === mediaKey(selected))
    : undefined;
  return (
    <main className={dusk ? "world dusk" : "world"}>
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
            {["Room", "Gallery", "Journal", "Search"].map((n) => (
              <button
                key={n}
                className={view === n ? "chosen" : ""}
                onClick={() => navigate(n)}
              >
                {n}
              </button>
            ))}
          </nav>
        )}
        <div className="header-tools">
          <button
            className="round"
            aria-label={dusk ? "Switch to daylight" : "Switch to evening"}
            onClick={() => setDusk(!dusk)}
          >
            {dusk ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user && (
            <button
              className="round"
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
              <LogOut size={17} />
            </button>
          )}
        </div>
      </header>
      <section className="intro">
        <div className="eyebrow">
          <span />
          YOUR OWN LITTLE CORNER OF THE WORLD
        </div>
        <h1>
          {view === "Search" ? (
            <>
              Find your <em>next world.</em>
            </>
          ) : (
            <>
              A room of <em>your own.</em>
            </>
          )}
        </h1>
        <p>
          {view === "Search"
            ? "Search books from Open Library. Your next chapter starts here."
            : "For the stories you’re in. And the ones you’ll never quite leave."}
        </p>
      </section>
      {session.isPending ? (
        <p className="loading" role="status">
          Opening your room…
        </p>
      ) : !user ? (
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
          {view !== "Journal" && (
            <div className="toolbar glass">
              <span className="eyebrow toolbar-label">
                {view === "Search"
                  ? "BOOK DISCOVERY"
                  : `${items.length} STORIES`}
              </span>
              <label className="search">
                <Search size={15} />
                <input
                  aria-label={
                    view === "Search" ? "Search books" : "Filter library"
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
          {error && !selected && (
            <p role="alert" className="error loading">
              {error}
            </p>
          )}
          {library.isError ? (
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
                      : `${results.data?.length ?? 0} books found`}
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
          ) : view === "Gallery" ? (
            filtered.length ? (
              <Gallery items={filtered} open={open} owned={items} />
            ) : (
              <div className="loading">
                No stories here yet.{" "}
                <button className="primary" onClick={() => navigate("Search")}>
                  Find a book
                </button>
              </div>
            )
          ) : (
            <section className="journal">
              {items.length === 0 ? (
                <p>Your journal begins with your first book.</p>
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
          V2 · BOOKS FIRST
          <br />
          Your original library is unchanged.
        </span>
      </footer>
      {selected && (
        <Detail
          key={mediaKey(selected)}
          media={selected}
          item={owned}
          close={() => setSelected(null)}
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
