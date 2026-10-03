import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderHeart, Plus, Search } from "lucide-react";
import { api } from "../api";
import { mediaConfig, mediaKey, type LibraryItem } from "../types";
import { Gallery } from "./Gallery";
import "./collections.css";

type Collection = { id: string; name: string; itemIds: string[] };
type Edit =
  | { kind: "create"; name: string }
  | { kind: "rename"; id: string; name: string }
  | { kind: "delete"; id: string }
  | { kind: "member"; id: string; itemId: string; add: boolean };
const queryKey = ["collections"];
const pendingId = "pending-collection";

export function Collections({
  items,
  open,
}: {
  items: LibraryItem[];
  open: (item: LibraryItem) => void;
}) {
  const client = useQueryClient();
  const formId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [rename, setRename] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch] = useState("");
  const collections = useQuery({
    queryKey,
    queryFn: ({ signal }) => api<Collection[]>("/collections", { signal }),
  });
  const edit = useMutation({
    mutationFn: (action: Edit) => {
      if (action.kind === "create")
        return api("/collections", {
          method: "POST",
          body: JSON.stringify({ name: action.name }),
        });
      const path = `/collections/${encodeURIComponent(action.id)}`;
      if (action.kind === "member")
        return api(`${path}/items/${encodeURIComponent(action.itemId)}`, {
          method: action.add ? "PUT" : "DELETE",
        });
      return api(path, {
        method: action.kind === "rename" ? "PATCH" : "DELETE",
        ...(action.kind === "rename"
          ? { body: JSON.stringify({ name: action.name }) }
          : {}),
      });
    },
    onMutate: async (action) => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<Collection[]>(queryKey);
      client.setQueryData<Collection[]>(queryKey, (current = []) => {
        if (action.kind === "create")
          return [
            ...current,
            { id: pendingId, name: action.name, itemIds: [] },
          ];
        if (action.kind === "delete")
          return current.filter((collection) => collection.id !== action.id);
        return current.map((collection) => {
          if (collection.id !== action.id) return collection;
          if (action.kind === "rename")
            return { ...collection, name: action.name };
          return {
            ...collection,
            itemIds: action.add
              ? [...new Set([...collection.itemIds, action.itemId])]
              : collection.itemIds.filter((id) => id !== action.itemId),
          };
        });
      });
      return { previous };
    },
    onError: (_error, _action, context) => {
      if (context?.previous) client.setQueryData(queryKey, context.previous);
    },
    onSuccess: (_data, action) => {
      if (action.kind === "create") setName("");
      if (action.kind === "rename") setRenaming(false);
      if (action.kind === "delete") {
        setConfirmDelete(false);
        setSelectedId(null);
      }
    },
    onSettled: async (_data, error, action) => {
      await client.invalidateQueries({ queryKey });
      if (!error && action.kind === "create") {
        const created = client
          .getQueryData<Collection[]>(queryKey)
          ?.find((collection) => collection.name === action.name);
        if (created) setSelectedId(created.id);
        setRenaming(false);
        setConfirmDelete(false);
        setSearch("");
      }
    },
  });
  const selected =
    collections.data?.find((collection) => collection.id === selectedId) ??
    collections.data?.[0];
  const members = items.filter((item) => selected?.itemIds.includes(item.id));
  const term = search.trim().toLocaleLowerCase();
  const matches = items.filter((item) =>
    `${item.title} ${item.creators.join(" ")} ${mediaConfig[item.type].label}`
      .toLocaleLowerCase()
      .includes(term),
  );
  const busy = edit.isPending;

  return (
    <section className="collections-workspace" aria-label="Custom collections">
      <div className="collections-intro">
        <FolderHeart size={28} aria-hidden="true" />
        <div>
          <h2>Collections</h2>
          <p>
            A little room for every interest. Gather favorites, weekend plans,
            or stories that belong together.
          </p>
        </div>
      </div>
      {edit.isError && (
        <p className="collections-message" role="alert">
          Could not save your collection. {edit.error.message} Please try again.
        </p>
      )}
      {collections.isError && (
        <div className="collections-message" role="alert">
          <p>Could not load collections. {collections.error.message}</p>
          <button
            type="button"
            onClick={() => void collections.refetch()}
            disabled={collections.isFetching}
          >
            Try again
          </button>
        </div>
      )}
      {collections.isPending && (
        <p className="collections-empty" role="status">
          Loading your collections…
        </p>
      )}
      {collections.data && (
        <div className="collections-layout">
          <aside className="collections-sidebar" aria-label="Your collections">
            <h3>Your collections</h3>
            <form
              className="collections-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (name.trim() && !busy)
                  edit.mutate({ kind: "create", name: name.trim() });
              }}
            >
              <label htmlFor={`${formId}-name`}>New collection name</label>
              <input
                id={`${formId}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Sunday favorites"
                disabled={busy}
                required
              />
              <button
                className="collections-primary"
                disabled={busy || !name.trim()}
              >
                <Plus size={16} aria-hidden="true" />
                Create collection
              </button>
            </form>
            <ul className="collections-list">
              {collections.data.map((collection) => (
                <li key={collection.id}>
                  <button
                    type="button"
                    aria-pressed={collection.id === selected?.id}
                    disabled={collection.id === pendingId}
                    onClick={() => {
                      setSelectedId(collection.id);
                      setRenaming(false);
                      setConfirmDelete(false);
                      setSearch("");
                      if (!busy) edit.reset();
                    }}
                  >
                    <span>{collection.name}</span>
                    <small>{collection.itemIds.length}</small>
                  </button>
                </li>
              ))}
            </ul>
            {!collections.data.length && (
              <p className="collections-hint">
                No collections yet. Give your first one a name.
              </p>
            )}
            <p className="collections-hint">
              An item can belong to as many collections as you like.
            </p>
          </aside>
          <div className="collections-content">
            {!selected ? (
              <div className="collections-empty">
                <FolderHeart size={36} aria-hidden="true" />
                <h3>Make it yours</h3>
                <p>
                  Create a collection, then fill it with items from your
                  library.
                </p>
              </div>
            ) : (
              <>
                <div className="collections-heading">
                  <div>
                    <h3>{selected.name}</h3>
                    <p>
                      {members.length} {members.length === 1 ? "item" : "items"}{" "}
                      in this collection
                    </p>
                  </div>
                  <div className="collections-actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setRename(selected.name);
                        setRenaming(true);
                        setConfirmDelete(false);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setConfirmDelete(true);
                        setRenaming(false);
                      }}
                    >
                      Delete collection
                    </button>
                  </div>
                </div>
                {renaming && (
                  <form
                    className="collections-form collections-edit"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (rename.trim() && !busy)
                        edit.mutate({
                          kind: "rename",
                          id: selected.id,
                          name: rename.trim(),
                        });
                    }}
                  >
                    <label htmlFor={`${formId}-rename`}>Collection name</label>
                    <input
                      id={`${formId}-rename`}
                      value={rename}
                      onChange={(event) => setRename(event.target.value)}
                      disabled={busy}
                      required
                      autoFocus
                    />
                    <div className="collections-actions">
                      <button
                        className="collections-primary"
                        disabled={busy || !rename.trim()}
                      >
                        Save name
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setRenaming(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                {confirmDelete && (
                  <div
                    className="collections-confirm"
                    role="group"
                    aria-label="Confirm collection deletion"
                  >
                    <p>
                      Delete “{selected.name}”? Your library items and other
                      collections will stay as they are.
                    </p>
                    <div className="collections-actions">
                      <button
                        type="button"
                        className="collections-primary"
                        disabled={busy}
                        onClick={() =>
                          edit.mutate({ kind: "delete", id: selected.id })
                        }
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmDelete(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {members.length ? (
                  <Gallery
                    items={members}
                    owned={items}
                    open={(media) => {
                      const item = members.find(
                        (member) => mediaKey(member) === mediaKey(media),
                      );
                      if (item) open(item);
                    }}
                  />
                ) : (
                  <p className="collections-empty">
                    This collection is waiting for its first item. Add something
                    from your library below.
                  </p>
                )}
                <section
                  className="collections-picker"
                  aria-label="Manage collection items"
                >
                  <h3>From your library</h3>
                  <p>Add or remove items in “{selected.name}”.</p>
                  <label
                    className="collections-search"
                    htmlFor={`${formId}-search`}
                  >
                    <Search size={18} aria-hidden="true" />
                    <span className="visually-hidden">Search your library</span>
                    <input
                      id={`${formId}-search`}
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search titles, creators, or media types"
                    />
                  </label>
                  {!items.length ? (
                    <p className="collections-empty">
                      Your library is empty. Save some items to your library to
                      start collecting.
                    </p>
                  ) : !matches.length ? (
                    <p className="collections-empty" role="status">
                      No library items match “{search}”. Try another search.
                    </p>
                  ) : (
                    <ul className="collections-members">
                      {matches.map((item) => {
                        const included = selected.itemIds.includes(item.id);
                        return (
                          <li key={item.id}>
                            <div>
                              <strong>{item.title}</strong>
                              <small>
                                {mediaConfig[item.type].label}
                                {item.creators.length > 0 &&
                                  ` · ${item.creators.join(", ")}`}
                              </small>
                            </div>
                            <button
                              type="button"
                              aria-label={`${included ? "Remove" : "Add"} ${item.title} ${included ? "from" : "to"} ${selected.name}`}
                              aria-pressed={included}
                              disabled={busy}
                              onClick={() =>
                                edit.mutate({
                                  kind: "member",
                                  id: selected.id,
                                  itemId: item.id,
                                  add: !included,
                                })
                              }
                            >
                              {included ? "Remove" : "Add"}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
