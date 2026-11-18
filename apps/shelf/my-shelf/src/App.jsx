import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clapperboard,
  Heart,
  Home,
  Library,
  Menu,
  Plus,
  Search,
  Sparkles,
  X,
  FolderPlus,
  Trash2,
  Check,
  ArrowLeft,
} from "lucide-react";

const BOOK_STATUSES = [
  {
    value: "currently-reading",
    label: "Currently Reading",
  },
  {
    value: "yet-to-read",
    label: "Yet to Read",
  },
  {
    value: "completed",
    label: "Completed",
  },
];

const MEDIA_STATUSES = [
  {
    value: "currently-seeing",
    label: "Currently Watching",
  },
  {
    value: "yet-to-see",
    label: "Yet to Watch",
  },
  {
    value: "completed",
    label: "Completed",
  },
];

const EMPTY_LIBRARY = {
  items: [],
  genres: [],
  collections: [],
  operations: [],
};

const LOCAL_STORAGE_KEY = "my-shelf-library-data";

function applyOperation(lib, op) {
  const current = {
    items: Array.isArray(lib?.items) ? lib.items : [],
    genres: Array.isArray(lib?.genres) ? lib.genres : [],
    collections: Array.isArray(lib?.collections) ? lib.collections : [],
    operations: Array.isArray(lib?.operations) ? lib.operations : [],
  };

  if (current.operations.some((x) => x.id === op.id)) return current;
  const p = op.payload || {};

  let items = [...current.items];
  let genres = [...current.genres];
  let collections = [...current.collections];

  const ensureGenre = (g) => {
    if (g && typeof g === "string" && g.trim() && !genres.includes(g.trim())) {
      genres.push(g.trim());
    }
  };

  if (op.type === "ADD_ITEM") {
    if (p.item) {
      items.push(p.item);
      ensureGenre(p.item.genre);
    }
  }

  if (op.type === "UPDATE_ITEM") {
    if (p.item) {
      const exists = items.some((x) => x.id === p.item.id);
      items = exists
        ? items.map((x) =>
            x.id === p.item.id ? { ...x, ...p.item, updatedAt: op.timestamp } : x
          )
        : [...items, p.item];
      ensureGenre(p.item.genre);
    }
  }

  if (op.type === "DELETE_ITEM") {
    items = items.filter((x) => x.id !== p.id);
  }

  if (op.type === "TOGGLE_FAVORITE") {
    items = items.map((x) =>
      x.id === p.id ? { ...x, favorite: !x.favorite, updatedAt: op.timestamp } : x
    );
  }

  if (op.type === "ADD_GENRE") {
    ensureGenre(p.genre);
  }

  if (op.type === "DELETE_GENRE") {
    genres = genres.filter((x) => x !== p.genre);
  }

  if (op.type === "ADD_COLLECTION") {
    if (p.collection) {
      collections.push(p.collection);
    }
  }

  if (op.type === "DELETE_COLLECTION") {
    collections = collections.filter((x) => x.id !== p.id);
    items = items.map((x) => ({
      ...x,
      collectionIds: (x.collectionIds || []).filter((y) => y !== p.id),
    }));
  }

  const operations = [...current.operations, op].slice(-500);

  return {
    items,
    genres,
    collections,
    operations,
  };
}

export default function App() {
  const [section, setSection] = useState("home");

  const [library, setLibrary] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          items: Array.isArray(parsed.items) ? parsed.items : [],
          genres: Array.isArray(parsed.genres) ? parsed.genres : [],
          collections: Array.isArray(parsed.collections) ? parsed.collections : [],
          operations: Array.isArray(parsed.operations) ? parsed.operations : [],
        };
      }
    } catch (e) {
      console.error("Error reading localStorage:", e);
    }
    return EMPTY_LIBRARY;
  });

  const [search, setSearch] = useState("");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [showCollectionModal, setShowCollectionModal] =
    useState(false);

  const [selectedCollection, setSelectedCollection] =
    useState(null);

  const [syncing, setSyncing] =
    useState(false);

  const [lastSynced, setLastSynced] =
    useState(null);

  const [editingItem, setEditingItem] =
    useState(null);

  // =====================================================
  // DISPATCH OPERATION (OPTIMISTIC LOCAL UPDATE + BACKGROUND SYNC)
  // =====================================================

  const dispatchOperation = async (operation) => {
    let nextState;
    setLibrary((current) => {
      nextState = applyOperation(current, operation);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState));
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }
      return nextState;
    });

    try {
      setSyncing(true);
      const response = await fetch("/api/library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operation }),
      });

      if (response.ok) {
        const serverLibrary = await response.json();
        if (serverLibrary && Array.isArray(serverLibrary.items)) {
          setLibrary(serverLibrary);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serverLibrary));
          } catch (e) {}
        }
        setLastSynced(new Date());
      }
    } catch (error) {
      console.warn("Background sync warning (local state preserved):", error);
    } finally {
      setSyncing(false);
    }
  };

  // =====================================================
  // LOAD LIBRARY
  // =====================================================

  const loadLibrary = async () => {
    try {
      setSyncing(true);

      const response = await fetch("/api/library");

      if (!response.ok) {
        throw new Error("Failed to load library");
      }

      const data = await response.json();

      if (data && Array.isArray(data.items)) {
        const loaded = {
          items: data.items || [],
          genres: data.genres || [],
          collections: data.collections || [],
          operations: data.operations || [],
        };
        setLibrary(loaded);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(loaded));
        } catch (e) {}
        setLastSynced(new Date());
      }
    } catch (error) {
      console.warn("Library load fallback to local storage:", error);
    } finally {
      setSyncing(false);
    }
  };

  // =====================================================
  // AUTO SYNC
  // =====================================================

  useEffect(() => {
    loadLibrary();

    const interval = setInterval(loadLibrary, 10000);

    return () => clearInterval(interval);
  }, []);

  // =====================================================
  // DATA
  // =====================================================

  const reading = useMemo(() => {
    return library.items.filter((item) => item.section === "books");
  }, [library.items]);

  const watching = useMemo(() => {
    return library.items.filter((item) => item.section === "media");
  }, [library.items]);

  const favorites = useMemo(() => {
    return library.items.filter((item) => item.favorite);
  }, [library.items]);

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredItems = useMemo(() => {
    if (!search.trim()) {
      return library.items;
    }

    const query = search.toLowerCase();

    return library.items.filter((item) => {
      const collectionNames = (item.collectionIds || []).map((id) => {
        const collection = library.collections.find(
          (collection) => collection.id === id
        );

        return collection?.name || "";
      });

      const searchableText = [
        item.title,
        item.author,
        item.director,
        item.genre,
        item.type,
        ...collectionNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [search, library.items, library.collections]);

  // =====================================================
  // ADD ITEM
  // =====================================================

  const addItem = async (item) => {
    const operation = {
      id: crypto.randomUUID(),

      type: "ADD_ITEM",

      timestamp: new Date().toISOString(),

      payload: {
        item: {
          ...item,

          id: crypto.randomUUID(),

          createdAt: new Date().toISOString(),

          updatedAt: new Date().toISOString(),
        },
      },
    };

    setShowAddModal(false);
    await dispatchOperation(operation);
  };

  // =====================================================
  // CREATE COLLECTION
  // =====================================================

  const createCollection = async ({ name, description }) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    const collection = {
      id: crypto.randomUUID(),

      name: trimmedName,

      description: description.trim(),

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString(),
    };

    const operation = {
      id: crypto.randomUUID(),

      type: "ADD_COLLECTION",

      timestamp: new Date().toISOString(),

      payload: {
        collection,
      },
    };

    setShowCollectionModal(false);
    await dispatchOperation(operation);
  };

  // =====================================================
  // ADD EXISTING ITEM TO COLLECTION
  // =====================================================

  const addItemToCollection = async (itemId, collectionId) => {
    const item = library.items.find((x) => x.id === itemId);

    if (!item) return;

    const existingCollections = item.collectionIds || [];

    if (existingCollections.includes(collectionId)) {
      return;
    }

    const updatedItem = {
      ...item,

      collectionIds: [...existingCollections, collectionId],

      updatedAt: new Date().toISOString(),
    };

    const operation = {
      id: crypto.randomUUID(),

      type: "UPDATE_ITEM",

      timestamp: new Date().toISOString(),

      payload: {
        item: updatedItem,
      },
    };

    await dispatchOperation(operation);
  };

  // =====================================================
  // REMOVE ITEM FROM COLLECTION
  // =====================================================

  const removeItemFromCollection = async (itemId, collectionId) => {
    const item = library.items.find((x) => x.id === itemId);

    if (!item) return;

    const updatedItem = {
      ...item,

      collectionIds: (item.collectionIds || []).filter(
        (id) => id !== collectionId
      ),

      updatedAt: new Date().toISOString(),
    };

    const operation = {
      id: crypto.randomUUID(),

      type: "UPDATE_ITEM",

      timestamp: new Date().toISOString(),

      payload: {
        item: updatedItem,
      },
    };

    await dispatchOperation(operation);
  };

  // =====================================================
  // DELETE COLLECTION
  // =====================================================

  const deleteCollection = async (collectionId) => {
    const confirmed = window.confirm(
      "Delete this collection? Your books and media will NOT be deleted."
    );

    if (!confirmed) {
      return;
    }

    const operation = {
      id: crypto.randomUUID(),

      type: "DELETE_COLLECTION",

      timestamp: new Date().toISOString(),

      payload: {
        id: collectionId,
      },
    };

    setSelectedCollection(null);
    setSection("collections");
    await dispatchOperation(operation);
  };

  // =====================================================
  // DELETE ITEM
  // =====================================================

  const deleteItem = async (itemId) => {
    const confirmed = window.confirm(
      "Delete this item from your library?"
    );

    if (!confirmed) return;

    const operation = {
      id: crypto.randomUUID(),

      type: "DELETE_ITEM",

      timestamp: new Date().toISOString(),

      payload: {
        id: itemId,
      },
    };

    await dispatchOperation(operation);
  };

  // =====================================================
  // UPDATE ITEM
  // =====================================================

  const updateItem = async (updatedItem) => {
    const operation = {
      id: crypto.randomUUID(),

      type: "UPDATE_ITEM",

      timestamp: new Date().toISOString(),

      payload: {
        item: {
          ...updatedItem,

          updatedAt: new Date().toISOString(),
        },
      },
    };

    setEditingItem(null);
    await dispatchOperation(operation);
  };

  // =====================================================
  // TOGGLE FAVORITE
  // =====================================================

  const toggleFavorite = async (itemId) => {
    const operation = {
      id: crypto.randomUUID(),

      type: "TOGGLE_FAVORITE",

      timestamp: new Date().toISOString(),

      payload: {
        id: itemId,
      },
    };

    await dispatchOperation(operation);
  };


  // =====================================================
  // MAIN APP
  // =====================================================

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#171717]">

      <div className="flex min-h-screen">

        <Sidebar
          section={section}
          setSection={setSection}
          open={sidebarOpen}
          setOpen={setSidebarOpen}
        />

        <main className="min-w-0 flex-1">

          <Header
            search={search}
            setSearch={setSearch}
            syncing={syncing}
            lastSynced={lastSynced}
            onSync={loadLibrary}
            onAdd={() =>
              setShowAddModal(true)
            }
            onMenu={() =>
              setSidebarOpen(true)
            }
          />

          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

            <PageContent
              section={section}
              library={library}
              reading={reading}
              watching={watching}
              favorites={favorites}
              filteredItems={
                filteredItems
              }
              setSection={
                setSection
              }
              selectedCollection={
                selectedCollection
              }
              setSelectedCollection={
                setSelectedCollection
              }
              onCreateCollection={() =>
                setShowCollectionModal(
                  true
                )
              }
              onAddItemToCollection={
                addItemToCollection
              }
              onRemoveItemFromCollection={
                removeItemFromCollection
              }
              onDeleteCollection={
                deleteCollection
              }
              onDeleteItem={
                deleteItem
              }
              onEditItem={(item) => {
                setEditingItem(item);
              }}
              onToggleFavorite={
                toggleFavorite
              }
              collections={
                library.collections
              }
            />

          </div>

        </main>
      </div>

      {/* ADD ITEM */}

      {showAddModal && (
        <AddItemModal
          onClose={() =>
            setShowAddModal(false)
          }
          onAdd={addItem}
        />
      )}

      {/* CREATE COLLECTION */}

      {showCollectionModal && (
        <CreateCollectionModal
          onClose={() =>
            setShowCollectionModal(
              false
            )
          }
          onCreate={
            createCollection
          }
        />
      )}

      {/* EDIT ITEM */}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() =>
            setEditingItem(null)
          }
          onSave={updateItem}
        />
      )}

    </div>
  );
}

// =====================================================
// SIDEBAR
// =====================================================

function Sidebar({
  section,
  setSection,
  open,
  setOpen,
}) {
  return (
    <>
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() =>
            setOpen(false)
          }
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          w-72
          transform
          border-r border-black/5
          bg-white
          p-5
          transition-transform
          lg:static
          lg:translate-x-0
          ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >

        {/* LOGO */}

        <div className="flex items-center justify-between">

          <button
            onClick={() => {
              setSection("home");
              setOpen(false);
            }}
            className="flex items-center gap-3"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-white">
              <Library size={20} />
            </div>

            <div className="text-left">

              <div className="font-bold">
                My Library
              </div>

              <div className="text-xs text-black/45">
                Reading & Watching
              </div>

            </div>

          </button>

          <button
            className="lg:hidden"
            onClick={() =>
              setOpen(false)
            }
          >
            <X size={20} />
          </button>

        </div>

        {/* NAVIGATION */}

        <nav className="mt-8 space-y-7">

          <NavGroup
            title="HOME"
            items={[
              {
                id: "home",
                label: "Dashboard",
                icon: Home,
              },

              {
                id: "favorites",
                label: "Favorites",
                icon: Heart,
              },
            ]}
            section={section}
            setSection={setSection}
            close={() =>
              setOpen(false)
            }
          />

          <NavGroup
            title="READING"
            items={[
              {
                id: "books",
                label: "All Reading",
                icon: BookOpen,
              },

              {
                id:
                  "currently-reading",
                label:
                  "Currently Reading",
              },

              {
                id: "yet-to-read",
                label:
                  "Yet to Read",
              },

              {
                id: "books-completed",
                label:
                  "Completed",
              },

              {
                id:
                  "book-collections",
                label:
                  "Collections",
              },
            ]}
            section={section}
            setSection={setSection}
            close={() =>
              setOpen(false)
            }
          />

          <NavGroup
            title="WATCHING"
            items={[
              {
                id: "media",
                label: "All Watching",
                icon: Clapperboard,
              },

              {
                id:
                  "currently-seeing",
                label:
                  "Currently Watching",
              },

              {
                id: "yet-to-see",
                label:
                  "Yet to Watch",
              },

              {
                id: "media-completed",
                label:
                  "Completed",
              },

              {
                id:
                  "media-collections",
                label:
                  "Collections",
              },
            ]}
            section={section}
            setSection={setSection}
            close={() =>
              setOpen(false)
            }
          />

          <NavGroup
            title="LIBRARY"
            items={[
              {
                id: "collections",
                label:
                  "All Collections",
              },

              {
                id: "genres",
                label: "Genres",
              },
            ]}
            section={section}
            setSection={setSection}
            close={() =>
              setOpen(false)
            }
          />

        </nav>



      </aside>
    </>
  );
}

// =====================================================
// NAV GROUP
// =====================================================

function NavGroup({
  title,
  items,
  section,
  setSection,
  close,
}) {
  return (
    <div>

      <div className="mb-2 px-3 text-[10px] font-bold tracking-[0.18em] text-black/35">
        {title}
      </div>

      <div className="space-y-1">

        {items.map((item) => {

          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                setSection(
                  item.id
                );

                close();
              }}
              className={`
                flex w-full items-center gap-3
                rounded-xl px-3 py-2.5
                text-left text-sm
                transition
                ${
                  section === item.id
                    ? "bg-black text-white"
                    : "text-black/60 hover:bg-black/5 hover:text-black"
                }
              `}
            >

              {Icon && (
                <Icon size={17} />
              )}

              <span>
                {item.label}
              </span>

            </button>
          );
        })}

      </div>
    </div>
  );
}

// =====================================================
// HEADER
// =====================================================

function Header({
  search,
  setSearch,
  syncing,
  lastSynced,
  onSync,
  onAdd,
  onMenu,
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f7f7f5]/90 backdrop-blur-xl">

      <div className="flex h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">

        <button
          onClick={onMenu}
          className="rounded-xl p-2 hover:bg-black/5 lg:hidden"
        >
          <Menu size={21} />
        </button>

        {/* SEARCH */}

        <div className="relative max-w-xl flex-1">

          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search your library..."
            className="
              w-full rounded-2xl
              border border-black/5
              bg-white
              py-3 pl-10 pr-4
              text-sm
              outline-none
              placeholder:text-black/30
              focus:border-black/20
            "
          />

        </div>

        {/* SYNC */}

        <div className="hidden items-center gap-2 text-xs text-black/40 sm:flex">

          <span
            className={`
              h-2 w-2 rounded-full
              ${
                syncing
                  ? "animate-pulse bg-blue-500"
                  : "bg-green-500"
              }
            `}
          />

          {syncing
            ? "Syncing..."
            : lastSynced
              ? "Saved"
              : "Ready"}

        </div>

        <button
          onClick={onSync}
          className="
            hidden rounded-xl
            border border-black/10
            bg-white
            px-3 py-2.5
            text-sm
            hover:bg-black/5
            sm:block
          "
        >
          Sync
        </button>

        <button
          onClick={onAdd}
          className="
            flex items-center gap-2
            rounded-xl bg-black
            px-4 py-2.5
            text-sm font-medium
            text-white
            hover:bg-black/80
          "
        >

          <Plus size={17} />

          <span className="hidden sm:inline">
            Add Item
          </span>

        </button>

      </div>

    </header>
  );
}

// =====================================================
// PAGE CONTENT
// =====================================================

function PageContent({
  section,
  library,
  reading,
  watching,
  favorites,
  filteredItems,
  setSection,
  selectedCollection,
  setSelectedCollection,
  onCreateCollection,
  onAddItemToCollection,
  onRemoveItemFromCollection,
  onDeleteCollection,
  onDeleteItem,
  onEditItem,
  onToggleFavorite,
  collections,
}) {

  // DASHBOARD

  if (section === "home") {
    return (
      <Dashboard
        library={library}
        reading={reading}
        watching={watching}
        favorites={favorites}
        setSection={setSection}
      />
    );
  }

  // FAVORITES

  if (section === "favorites") {
    return (
      <ItemPage
        title="Favorites"
        subtitle="Everything you've marked as a favorite."
        items={favorites}
        onDeleteItem={onDeleteItem}
        onEditItem={onEditItem}
        onToggleFavorite={onToggleFavorite}
        onAddItemToCollection={onAddItemToCollection}
        collections={collections}
      />
    );
  }

  // READING

  if (section === "books") {
    return (
      <ItemPage
        title="Reading"
        subtitle="Books and articles you're reading or want to read."
        items={filteredItems.filter(
          (item) =>
            item.section ===
            "books"
        )}
        onDeleteItem={onDeleteItem}
        onEditItem={onEditItem}
        onToggleFavorite={onToggleFavorite}
        onAddItemToCollection={onAddItemToCollection}
        collections={collections}
      />
    );
  }

  // WATCHING

  if (section === "media") {
    return (
      <ItemPage
        title="Watching"
        subtitle="Movies and series you're watching or want to watch."
        items={filteredItems.filter(
          (item) =>
            item.section ===
            "media"
        )}
        onDeleteItem={onDeleteItem}
        onEditItem={onEditItem}
        onToggleFavorite={onToggleFavorite}
        onAddItemToCollection={onAddItemToCollection}
        collections={collections}
      />
    );
  }

  // STATUS

  if (
    [
      "currently-reading",
      "yet-to-read",
      "books-completed",
      "currently-seeing",
      "yet-to-see",
      "media-completed",
    ].includes(section)
  ) {

    const statusMap = {
      "currently-reading":
        "currently-reading",

      "yet-to-read":
        "yet-to-read",

      "books-completed":
        "completed",

      "currently-seeing":
        "currently-seeing",

      "yet-to-see":
        "yet-to-see",

      "media-completed":
        "completed",
    };

    const isReading =
      section ===
        "currently-reading" ||
      section === "yet-to-read" ||
      section ===
        "books-completed";

    const items =
      filteredItems.filter(
        (item) =>
          item.section ===
            (isReading
              ? "books"
              : "media") &&
          item.status ===
            statusMap[section]
      );

    return (
      <ItemPage
        title={
          isReading
            ? "Reading"
            : "Watching"
        }
        subtitle={
          isReading
            ? getReadingStatusLabel(
                section
              )
            : getWatchingStatusLabel(
                section
              )
        }
        items={items}
        onDeleteItem={onDeleteItem}
        onEditItem={onEditItem}
        onToggleFavorite={onToggleFavorite}
        onAddItemToCollection={onAddItemToCollection}
        collections={collections}
      />
    );
  }

  // COLLECTIONS

  if (
    [
      "collections",
      "book-collections",
      "media-collections",
    ].includes(section)
  ) {

    if (selectedCollection) {
      return (
        <CollectionDetailPage
          collection={
            selectedCollection
          }
          items={
            library.items
          }
          allItems={
            library.items
          }
          onBack={() =>
            setSelectedCollection(
              null
            )
          }
          onAddItem={
            onAddItemToCollection
          }
          onRemoveItem={
            onRemoveItemFromCollection
          }
          onDelete={
            onDeleteCollection
          }
        />
      );
    }

    return (
      <CollectionsPage
        collections={
          library.collections
        }
        items={library.items}
        onCreate={
          onCreateCollection
        }
        onOpen={(collection) =>
          setSelectedCollection(
            collection
          )
        }
      />
    );
  }

  // GENRES

  if (section === "genres") {
    return (
      <GenresPage
        genres={
          library.genres
        }
      />
    );
  }

  return null;
}

// =====================================================
// STATUS LABELS
// =====================================================

function getReadingStatusLabel(
  section
) {
  if (
    section ===
    "currently-reading"
  ) {
    return "Books and articles you're currently reading.";
  }

  if (
    section === "yet-to-read"
  ) {
    return "Books and articles you want to read.";
  }

  return "Books and articles you've completed.";
}

function getWatchingStatusLabel(
  section
) {
  if (
    section ===
    "currently-seeing"
  ) {
    return "Movies and series you're currently watching.";
  }

  if (
    section === "yet-to-see"
  ) {
    return "Movies and series you want to watch.";
  }

  return "Movies and series you've completed.";
}

// =====================================================
// DASHBOARD
// =====================================================

function Dashboard({
  library,
  reading,
  watching,
  favorites,
  setSection,
}) {

  const completedReading =
    reading.filter(
      (item) =>
        item.status ===
        "completed"
    );

  const currentlyReading =
    reading.filter(
      (item) =>
        item.status ===
        "currently-reading"
    );

  const currentlyWatching =
    watching.filter(
      (item) =>
        item.status ===
        "currently-seeing"
    );

  const completedWatching =
    watching.filter(
      (item) =>
        item.status ===
        "completed"
    );

  const articles =
    reading.filter(
      (item) =>
        item.type ===
        "article"
    );

  const movies =
    watching.filter(
      (item) =>
        item.type ===
        "movie"
    );

  const series =
    watching.filter(
      (item) =>
        item.type ===
        "series"
    );

  return (
    <div>

      <div className="mb-8">

        <div className="mb-2 flex items-center gap-2 text-sm text-black/45">

          <Sparkles size={15} />

          Your personal library

        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Welcome back.
        </h1>

        <p className="mt-2 text-sm text-black/45">
          Keep track of what you're
          reading, watching, and loving.
        </p>

      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          label="Total Reading"
          value={reading.length}
          icon={BookOpen}
        />

        <StatCard
          label="Total Watching"
          value={watching.length}
          icon={Clapperboard}
        />

        <StatCard
          label="Favorites"
          value={favorites.length}
          icon={Heart}
        />

        <StatCard
          label="Collections"
          value={
            library.collections
              .length
          }
          icon={Library}
        />

      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">

        <MiniStat
          title="Currently Reading"
          value={
            currentlyReading.length
          }
          onClick={() =>
            setSection(
              "currently-reading"
            )
          }
        />

        <MiniStat
          title="Currently Watching"
          value={
            currentlyWatching.length
          }
          onClick={() =>
            setSection(
              "currently-seeing"
            )
          }
        />

        <MiniStat
          title="Completed"
          value={
            completedReading.length +
            completedWatching.length
          }
          onClick={() =>
            setSection(
              "books-completed"
            )
          }
        />

      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">

        <DashboardSection
          title="Currently Reading"
          items={
            currentlyReading
          }
        />

        <DashboardSection
          title="Currently Watching"
          items={
            currentlyWatching
          }
        />

        <DashboardSection
          title="Recently Completed"
          items={[
            ...completedReading,
            ...completedWatching,
          ]
            .sort(
              (a, b) =>
                new Date(
                  b.updatedAt ||
                    0
                ) -
                new Date(
                  a.updatedAt ||
                    0
                )
            )
            .slice(0, 5)}
        />

        <DashboardSection
          title="Favorites"
          items={
            favorites.slice(0, 5)
          }
        />

      </div>

      <div className="mt-8 rounded-3xl border border-black/5 bg-white p-6">

        <h2 className="font-semibold">
          Library overview
        </h2>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">

          <Overview
            label="Books"
            value={
              reading.filter(
                (item) =>
                  item.type ===
                  "book"
              ).length
            }
          />

          <Overview
            label="Articles"
            value={
              articles.length
            }
          />

          <Overview
            label="Movies"
            value={
              movies.length
            }
          />

          <Overview
            label="Series"
            value={
              series.length
            }
          />

        </div>

      </div>

    </div>
  );
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <span className="text-sm text-black/45">
          {label}
        </span>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5">
          <Icon size={17} />
        </div>

      </div>

      <div className="mt-5 text-3xl font-bold">
        {value}
      </div>

    </div>
  );
}

// =====================================================
// MINI STAT
// =====================================================

function MiniStat({
  title,
  value,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="
        rounded-3xl
        border border-black/5
        bg-white
        p-5
        text-left
        transition
        hover:-translate-y-0.5
        hover:shadow-md
      "
    >

      <div className="text-sm text-black/45">
        {title}
      </div>

      <div className="mt-3 text-2xl font-bold">
        {value}
      </div>

    </button>
  );
}

// =====================================================
// DASHBOARD SECTION
// =====================================================

function DashboardSection({
  title,
  items,
}) {
  return (
    <section>

      <div className="mb-3 flex items-center justify-between">

        <h2 className="font-semibold">
          {title}
        </h2>

        <span className="text-xs text-black/35">
          {items.length}
        </span>

      </div>

      <div className="space-y-2">

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-sm text-black/35">
            Nothing here yet.
          </div>
        ) : (
          items.map(
            (item) => (
              <CompactItem
                key={item.id}
                item={item}
              />
            )
          )
        )}

      </div>

    </section>
  );
}

// =====================================================
// COMPACT ITEM
// =====================================================

function CompactItem({
  item,
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-4">

      <div className="flex min-w-0 items-center gap-3">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/5">

          {item.section ===
          "books" ? (
            <BookOpen size={17} />
          ) : (
            <Clapperboard
              size={17}
            />
          )}

        </div>

        <div className="min-w-0">

          <div className="truncate text-sm font-medium">
            {item.title}
          </div>

          <div className="truncate text-xs text-black/40">
            {item.author ||
              item.director ||
              item.type}
          </div>

        </div>

      </div>

      {item.favorite && (
        <Heart
          size={16}
          className="shrink-0 fill-current text-pink-500"
        />
      )}

    </div>
  );
}

// =====================================================
// OVERVIEW
// =====================================================

function Overview({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl bg-[#f7f7f5] p-4">

      <div className="text-xs text-black/40">
        {label}
      </div>

      <div className="mt-2 text-xl font-bold">
        {value}
      </div>

    </div>
  );
}

// =====================================================
// ITEM PAGE
// =====================================================

function ItemPage({
  title,
  subtitle,
  items,
  onDeleteItem,
  onEditItem,
  onToggleFavorite,
  onAddItemToCollection,
  collections,
}) {
  return (
    <div>

      <div className="mb-7">

        <h1 className="text-3xl font-bold tracking-tight">
          {title}
        </h1>

        <p className="mt-2 text-sm text-black/45">
          {subtitle}
        </p>

      </div>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

          {items.map(
            (item) => (
              <ItemCard
                key={item.id}
                item={item}
                onDelete={onDeleteItem}
                onEdit={onEditItem}
                onToggleFavorite={onToggleFavorite}
                onAddToCollection={onAddItemToCollection}
                collections={collections}
              />
            )
          )}

        </div>
      )}

    </div>
  );
}

// =====================================================
// ITEM CARD
// =====================================================

function ItemCard({
  item,
  onDelete,
  onEdit,
  onToggleFavorite,
  onAddToCollection,
  collections,
}) {

  const [showCollectionMenu, setShowCollectionMenu] =
    useState(false);

  const availableCollections = (collections || []).filter(
    (c) =>
      !(item.collectionIds || []).includes(c.id)
  );

  return (
    <article className="
      group
      relative
      rounded-3xl
      border border-black/5
      bg-white
      p-5
      shadow-sm
      transition
      hover:-translate-y-1
      hover:shadow-lg
    ">

      <div className="flex items-start justify-between">

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">

          {item.section ===
          "books" ? (
            <BookOpen size={19} />
          ) : (
            <Clapperboard
              size={19}
            />
          )}

        </div>

        <button
          onClick={() =>
            onToggleFavorite &&
            onToggleFavorite(
              item.id
            )
          }
          title={
            item.favorite
              ? "Remove from favorites"
              : "Add to favorites"
          }
          className="
            rounded-xl p-1.5
            transition
            hover:bg-pink-50
          "
        >
          <Heart
            size={18}
            className={
              item.favorite
                ? "fill-current text-pink-500"
                : "text-black/25 hover:text-pink-400"
            }
          />
        </button>

      </div>

      <div className="mt-5">

        <h3 className="line-clamp-2 font-semibold">
          {item.title}
        </h3>

        <p className="mt-1 text-sm text-black/45">
          {item.author ||
            item.director ||
            "No author/director"}
        </p>

      </div>

      <div className="mt-4 flex flex-wrap gap-2">

        {item.genre && (
          <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-black/55">
            {item.genre}
          </span>
        )}

        <StatusBadge
          item={item}
        />

      </div>

      <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">

        <Rating
          value={item.rating}
        />

        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium underline underline-offset-4"
          >
            Open Link
          </a>
        )}

      </div>

      {/* ACTION BUTTONS */}

      <div className="mt-4 flex items-center gap-1 border-t border-black/5 pt-4">

        <button
          onClick={() =>
            onEdit && onEdit(item)
          }
          title="Edit item"
          className="
            flex items-center gap-1.5
            rounded-lg
            px-2.5 py-1.5
            text-xs text-black/45
            transition
            hover:bg-black/5
            hover:text-black
          "
        >
          ✏️ Edit
        </button>

        <button
          onClick={() =>
            onDelete &&
            onDelete(item.id)
          }
          title="Delete item"
          className="
            flex items-center gap-1.5
            rounded-lg
            px-2.5 py-1.5
            text-xs text-black/45
            transition
            hover:bg-red-50
            hover:text-red-600
          "
        >
          🗑️ Delete
        </button>

        <div className="relative ml-auto">

          <button
            onClick={() =>
              setShowCollectionMenu(
                !showCollectionMenu
              )
            }
            title="Add to collection"
            className="
              flex items-center gap-1.5
              rounded-lg
              px-2.5 py-1.5
              text-xs text-black/45
              transition
              hover:bg-black/5
              hover:text-black
            "
          >
            <FolderPlus size={14} />
            Collection
          </button>

          {showCollectionMenu && (
            <div className="
              absolute bottom-full right-0
              z-10 mb-1
              w-56
              rounded-xl
              border border-black/10
              bg-white
              p-2
              shadow-lg
            ">

              <div className="mb-2 px-2 text-xs font-medium text-black/40">
                Add to collection
              </div>

              {availableCollections.length ===
              0 ? (
                <div className="px-2 py-3 text-center text-xs text-black/35">
                  No collections
                  available
                </div>
              ) : (
                availableCollections.map(
                  (c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onAddToCollection &&
                          onAddToCollection(
                            item.id,
                            c.id
                          );
                        setShowCollectionMenu(
                          false
                        );
                      }}
                      className="
                        flex w-full
                        items-center
                        gap-2
                        rounded-lg
                        px-2 py-2
                        text-left
                        text-xs
                        hover:bg-black/5
                      "
                    >
                      <Library
                        size={14}
                      />
                      {c.name}
                    </button>
                  )
                )
              )}

              <button
                onClick={() =>
                  setShowCollectionMenu(
                    false
                  )
                }
                className="
                  mt-1 w-full
                  rounded-lg
                  border border-black/5
                  py-1.5
                  text-xs
                  text-black/40
                  hover:bg-black/5
                "
              >
                Close
              </button>

            </div>
          )}

        </div>

      </div>

    </article>
  );
}

// =====================================================
// RATING
// =====================================================

function Rating({
  value,
}) {
  if (!value) {
    return (
      <span className="text-xs text-black/35">
        Not Rated
      </span>
    );
  }

  const fullStars =
    Math.floor(value);

  const halfStar =
    value % 1 !== 0;

  return (
    <div className="flex items-center gap-1">

      <span className="text-sm">
        {"★".repeat(
          fullStars
        )}

        {halfStar && "½"}
      </span>

      <span className="ml-1 text-xs font-medium text-black/45">
        {value.toFixed(1)}
      </span>

    </div>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({
  item,
}) {
  let status;

  if (
    item.status ===
    "completed"
  ) {
    status = "Completed";
  } else if (
    item.status ===
    "currently-reading"
  ) {
    status =
      "Currently Reading";
  } else if (
    item.status ===
    "currently-seeing"
  ) {
    status =
      "Currently Watching";
  } else if (
    item.status ===
    "yet-to-read"
  ) {
    status = "Yet to Read";
  } else {
    status = "Yet to Watch";
  }

  const completed =
    item.status ===
    "completed";

  const current =
    item.status ===
      "currently-reading" ||
    item.status ===
      "currently-seeing";

  return (
    <span
      className={`
        rounded-full
        px-2.5 py-1
        text-xs
        ${
          completed
            ? "bg-green-50 text-green-700"
            : current
              ? "bg-indigo-50 text-indigo-700"
              : "bg-black/5 text-black/50"
        }
      `}
    >
      {status}
    </span>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

function EmptyState() {
  return (
    <div className="
      rounded-3xl
      border border-dashed
      border-black/10
      bg-white
      p-12
      text-center
    ">

      <Library
        className="mx-auto text-black/20"
        size={30}
      />

      <h3 className="mt-4 font-semibold">
        Nothing here yet
      </h3>

      <p className="mt-1 text-sm text-black/40">
        Add something to your
        library to see it here.
      </p>

    </div>
  );
}

// =====================================================
// COLLECTIONS PAGE
// =====================================================

function CollectionsPage({
  collections,
  items,
  onCreate,
  onOpen,
}) {
  return (
    <div>

      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

        <div>

          <div className="mb-2 flex items-center gap-2 text-sm text-black/45">

            <Library size={16} />

            Organize your library

          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Collections
          </h1>

          <p className="mt-2 text-sm text-black/45">
            Create your own groups and
            add existing items to them.
          </p>

        </div>

        <button
          onClick={onCreate}
          className="
            flex items-center
            justify-center gap-2
            rounded-xl
            bg-black
            px-4 py-3
            text-sm
            font-medium
            text-white
            hover:bg-black/80
          "
        >

          <FolderPlus size={17} />

          New Collection

        </button>

      </div>

      {collections.length === 0 ? (
        <div className="
          rounded-3xl
          border border-dashed
          border-black/10
          bg-white
          p-12
          text-center
        ">

          <FolderPlus
            className="mx-auto text-black/20"
            size={34}
          />

          <h3 className="mt-4 font-semibold">
            Create your first collection
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm text-black/40">
            Collections let you group
            existing reading and watching
            items without duplicating them.
          </p>

          <button
            onClick={onCreate}
            className="
              mt-5
              rounded-xl
              bg-black
              px-4 py-2.5
              text-sm
              text-white
            "
          >
            Create Collection
          </button>

        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {collections.map(
            (collection) => {

              const collectionItems =
                items.filter(
                  (item) =>
                    (
                      item.collectionIds ||
                      []
                    ).includes(
                      collection.id
                    )
                );

              return (
                <button
                  key={
                    collection.id
                  }
                  onClick={() =>
                    onOpen(
                      collection
                    )
                  }
                  className="
                    rounded-3xl
                    border border-black/5
                    bg-white
                    p-6
                    text-left
                    shadow-sm
                    transition
                    hover:-translate-y-1
                    hover:shadow-lg
                  "
                >

                  <div className="flex items-start justify-between">

                    <div className="
                      flex h-11 w-11
                      items-center
                      justify-center
                      rounded-2xl
                      bg-black
                      text-white
                    ">

                      <Library
                        size={19}
                      />

                    </div>

                    <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-black/45">
                      {
                        collectionItems.length
                      } items
                    </span>

                  </div>

                  <h3 className="mt-5 font-semibold">
                    {
                      collection.name
                    }
                  </h3>

                  <p className="mt-1 line-clamp-2 text-sm text-black/40">
                    {
                      collection.description ||
                      "No description"
                    }
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-xs text-black/40">

                    <BookOpen
                      size={14}
                    />

                    {
                      collectionItems.filter(
                        (item) =>
                          item.section ===
                          "books"
                      ).length
                    }

                    Reading

                    <span>
                      ·
                    </span>

                    <Clapperboard
                      size={14}
                    />

                    {
                      collectionItems.filter(
                        (item) =>
                          item.section ===
                          "media"
                      ).length
                    }

                    Watching

                  </div>

                </button>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}

// =====================================================
// COLLECTION DETAIL
// =====================================================

function CollectionDetailPage({
  collection,
  items,
  allItems,
  onBack,
  onAddItem,
  onRemoveItem,
  onDelete,
}) {

  const [showAddItems, setShowAddItems] =
    useState(false);

  const collectionItems =
    items.filter(
      (item) =>
        (
          item.collectionIds ||
          []
        ).includes(
          collection.id
        )
    );

  return (
    <div>

      {/* HEADER */}

      <div className="mb-7">

        <button
          onClick={onBack}
          className="
            mb-5
            flex items-center
            gap-2
            text-sm
            text-black/45
            hover:text-black
          "
        >
          <ArrowLeft size={16} />
          Back to Collections
        </button>

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>

            <div className="flex items-center gap-3">

              <div className="
                flex h-12 w-12
                items-center
                justify-center
                rounded-2xl
                bg-black
                text-white
              ">
                <Library
                  size={21}
                />
              </div>

              <div>

                <h1 className="text-3xl font-bold tracking-tight">
                  {
                    collection.name
                  }
                </h1>

                <p className="mt-1 text-sm text-black/45">
                  {
                    collection.description ||
                    "Your collection"
                  }
                </p>

              </div>

            </div>

          </div>

          <div className="flex gap-2">

            <button
              onClick={() =>
                setShowAddItems(
                  true
                )
              }
              className="
                flex items-center
                gap-2
                rounded-xl
                bg-black
                px-4 py-2.5
                text-sm
                font-medium
                text-white
              "
            >

              <Plus size={17} />

              Add Existing Items

            </button>

            <button
              onClick={() =>
                onDelete(
                  collection.id
                )
              }
              className="
                flex items-center
                gap-2
                rounded-xl
                border
                border-red-100
                bg-red-50
                px-3 py-2.5
                text-sm
                text-red-600
              "
            >

              <Trash2
                size={16}
              />

              Delete

            </button>

          </div>

        </div>

      </div>

      {/* ITEMS */}

      {collectionItems.length === 0 ? (
        <div className="
          rounded-3xl
          border border-dashed
          border-black/10
          bg-white
          p-12
          text-center
        ">

          <Library
            className="mx-auto text-black/20"
            size={34}
          />

          <h3 className="mt-4 font-semibold">
            This collection is empty
          </h3>

          <p className="mt-2 text-sm text-black/40">
            Add items that already exist
            in your library.
          </p>

          <button
            onClick={() =>
              setShowAddItems(
                true
              )
            }
            className="
              mt-5
              rounded-xl
              bg-black
              px-4 py-2.5
              text-sm
              text-white
            "
          >
            Add Existing Items
          </button>

        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

          {collectionItems.map(
            (item) => (
              <CollectionItemCard
                key={item.id}
                item={item}
                collectionId={
                  collection.id
                }
                onRemove={
                  onRemoveItem
                }
              />
            )
          )}

        </div>
      )}

      {/* ADD EXISTING ITEMS MODAL */}

      {showAddItems && (
        <AddExistingItemsModal
          collection={
            collection
          }
          items={allItems}
          onClose={() =>
            setShowAddItems(
              false
            )
          }
          onAdd={onAddItem}
        />
      )}

    </div>
  );
}

// =====================================================
// COLLECTION ITEM CARD
// =====================================================

function CollectionItemCard({
  item,
  collectionId,
  onRemove,
}) {
  return (
    <article className="
      rounded-3xl
      border border-black/5
      bg-white
      p-5
      shadow-sm
    ">

      <div className="flex items-start justify-between">

        <div className="
          flex h-11 w-11
          items-center
          justify-center
          rounded-2xl
          bg-black
          text-white
        ">

          {item.section ===
          "books" ? (
            <BookOpen
              size={19}
            />
          ) : (
            <Clapperboard
              size={19}
            />
          )}

        </div>

        <button
          onClick={() =>
            onRemove(
              item.id,
              collectionId
            )
          }
          title="Remove from collection"
          className="
            rounded-xl
            p-2
            text-black/30
            hover:bg-red-50
            hover:text-red-500
          "
        >

          <X size={17} />

        </button>

      </div>

      <h3 className="mt-5 line-clamp-2 font-semibold">
        {item.title}
      </h3>

      <p className="mt-1 text-sm text-black/40">
        {item.author ||
          item.director ||
          item.type}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">

        {item.genre && (
          <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-black/50">
            {item.genre}
          </span>
        )}

        <StatusBadge
          item={item}
        />

      </div>

    </article>
  );
}

// =====================================================
// ADD EXISTING ITEMS MODAL
// =====================================================

function AddExistingItemsModal({
  collection,
  items,
  onClose,
  onAdd,
}) {

  const [query, setQuery] =
    useState("");

  const availableItems =
    items.filter(
      (item) =>
        !(
          item.collectionIds ||
          []
        ).includes(
          collection.id
        )
    );

  const filtered =
    availableItems.filter(
      (item) => {

        if (!query.trim()) {
          return true;
        }

        const text = [
          item.title,
          item.author,
          item.director,
          item.genre,
          item.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(
          query.toLowerCase()
        );
      }
    );

  return (
    <div className="
      fixed inset-0 z-50
      flex items-center
      justify-center
      bg-black/40
      p-4
      backdrop-blur-sm
    ">

      <div className="
        flex
        max-h-[90vh]
        w-full max-w-2xl
        flex-col
        overflow-hidden
        rounded-3xl
        bg-white
        shadow-2xl
      ">

        {/* HEADER */}

        <div className="border-b border-black/5 p-6">

          <div className="flex items-start justify-between">

            <div>

              <h2 className="text-xl font-bold">
                Add Existing Items
              </h2>

              <p className="mt-1 text-sm text-black/40">
                Add items to "
                {
                  collection.name
                }
                " without creating duplicates.
              </p>

            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 hover:bg-black/5"
            >
              <X size={20} />
            </button>

          </div>

          {/* SEARCH */}

          <div className="relative mt-5">

            <Search
              size={17}
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-black/30
              "
            />

            <input
              value={query}
              onChange={(e) =>
                setQuery(
                  e.target.value
                )
              }
              placeholder="Search existing items..."
              className="
                w-full
                rounded-xl
                border border-black/10
                py-3 pl-10 pr-4
                text-sm
                outline-none
              "
            />

          </div>

        </div>

        {/* ITEMS */}

        <div className="flex-1 overflow-y-auto p-6">

          {filtered.length === 0 ? (
            <div className="py-10 text-center">

              <Library
                className="mx-auto text-black/20"
                size={30}
              />

              <p className="mt-3 text-sm text-black/40">
                No available items found.
              </p>

            </div>
          ) : (
            <div className="space-y-2">

              {filtered.map(
                (item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      onAdd(
                        item.id,
                        collection.id
                      )
                    }
                    className="
                      flex w-full
                      items-center
                      justify-between
                      rounded-2xl
                      border
                      border-black/5
                      p-4
                      text-left
                      transition
                      hover:border-black/10
                      hover:bg-black/[0.02]
                    "
                  >

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="
                        flex h-10 w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-black/5
                      ">

                        {item.section ===
                        "books" ? (
                          <BookOpen
                            size={17}
                          />
                        ) : (
                          <Clapperboard
                            size={17}
                          />
                        )}

                      </div>

                      <div className="min-w-0">

                        <div className="truncate text-sm font-medium">
                          {
                            item.title
                          }
                        </div>

                        <div className="truncate text-xs text-black/40">
                          {
                            item.author ||
                            item.director ||
                            item.type
                          }

                        </div>

                      </div>

                    </div>

                    <Plus
                      size={18}
                      className="shrink-0 text-black/35"
                    />

                  </button>
                )
              )}

            </div>
          )}

        </div>

        {/* FOOTER */}

        <div className="border-t border-black/5 p-5">

          <button
            onClick={onClose}
            className="
              w-full
              rounded-xl
              border border-black/10
              py-2.5
              text-sm
              hover:bg-black/5
            "
          >
            Done
          </button>

        </div>

      </div>

    </div>
  );
}

// =====================================================
// CREATE COLLECTION MODAL
// =====================================================

function CreateCollectionModal({
  onClose,
  onCreate,
}) {

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const submit = (e) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    onCreate({
      name,
      description,
    });
  };

  return (
    <div className="
      fixed inset-0 z-50
      flex items-center
      justify-center
      bg-black/40
      p-4
      backdrop-blur-sm
    ">

      <div className="
        w-full max-w-md
        rounded-3xl
        bg-white
        p-6
        shadow-2xl
      ">

        <div className="flex items-start justify-between">

          <div>

            <div className="
              flex h-11 w-11
              items-center
              justify-center
              rounded-2xl
              bg-black
              text-white
            ">

              <FolderPlus
                size={19}
              />

            </div>

            <h2 className="mt-5 text-2xl font-bold">
              New Collection
            </h2>

            <p className="mt-1 text-sm text-black/40">
              Create a collection for
              your existing library items.
            </p>

          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-black/5"
          >
            <X size={20} />
          </button>

        </div>

        <form
          onSubmit={submit}
          className="mt-6 space-y-5"
        >

          {/* NAME */}

          <div>

            <label className="mb-2 block text-sm font-medium">

              Collection Name

              <span className="ml-1 text-red-500">
                *
              </span>

            </label>

            <input
              autoFocus
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              placeholder="e.g. Books to Read This Year"
              className="
                w-full
                rounded-xl
                border border-black/10
                px-3 py-3
                outline-none
                focus:border-black/30
              "
            />

          </div>

          {/* DESCRIPTION */}

          <div>

            <label className="mb-2 block text-sm font-medium">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              rows={3}
              placeholder="Optional description..."
              className="
                w-full
                resize-none
                rounded-xl
                border border-black/10
                px-3 py-3
                outline-none
                focus:border-black/30
              "
            />

          </div>

          {/* BUTTONS */}

          <div className="flex justify-end gap-2 border-t border-black/5 pt-5">

            <button
              type="button"
              onClick={onClose}
              className="
                rounded-xl
                px-4 py-2.5
                text-sm
                hover:bg-black/5
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                !name.trim()
              }
              className="
                rounded-xl
                bg-black
                px-5 py-2.5
                text-sm
                font-medium
                text-white
                disabled:cursor-not-allowed
                disabled:opacity-30
              "
            >
              Create Collection
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

// =====================================================
// ADD ITEM MODAL
// =====================================================

function AddItemModal({
  onClose,
  onAdd,
}) {

  const [section, setSection] =
    useState("books");

  const [type, setType] =
    useState("book");

  const [form, setForm] =
    useState({
      title: "",
      author: "",
      director: "",
      genre: "",
      rating: "",
      status: "yet-to-read",
      link: "",
      notes: "",
      favorite: false,
    });

  const update = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const changeSection = (
    newSection
  ) => {

    setSection(newSection);

    setType(
      newSection === "books"
        ? "book"
        : "movie"
    );

    setForm((current) => ({
      ...current,

      status:
        newSection === "books"
          ? "yet-to-read"
          : "yet-to-see",
    }));
  };

  const submit = (e) => {

    e.preventDefault();

    // ONLY TITLE IS REQUIRED

    if (!form.title.trim()) {
      return;
    }

    onAdd({
      section,

      type,

      title:
        form.title.trim(),

      ...(section === "books"
        ? {
            author:
              form.author.trim(),
          }
        : {
            director:
              form.director.trim(),
          }),

      genre:
        form.genre.trim(),

      rating:
        form.rating
          ? Number(form.rating)
          : null,

      status:
        form.status,

      link:
        form.link.trim(),

      notes:
        form.notes.trim(),

      favorite:
        form.favorite,

      collectionIds: [],
    });
  };

  const statuses =
    section === "books"
      ? BOOK_STATUSES
      : MEDIA_STATUSES;

  return (
    <div className="
      fixed inset-0 z-50
      flex items-center
      justify-center
      bg-black/40
      p-4
      backdrop-blur-sm
    ">

      <div className="
        max-h-[90vh]
        w-full max-w-2xl
        overflow-y-auto
        rounded-3xl
        bg-white
        p-6
        shadow-2xl
        sm:p-8
      ">

        <div className="flex items-start justify-between">

          <div>

            <h2 className="text-2xl font-bold">
              Add to Library
            </h2>

            <p className="mt-1 text-sm text-black/40">
              Add something you're
              reading or watching.
            </p>

          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-black/5"
          >
            <X size={20} />
          </button>

        </div>

        {/* READING / WATCHING */}

        <div className="
          mt-7
          grid grid-cols-2
          gap-2
          rounded-2xl
          bg-black/5
          p-1
        ">

          <button
            type="button"
            onClick={() =>
              changeSection(
                "books"
              )
            }
            className={`
              rounded-xl
              py-2.5
              text-sm
              font-medium
              ${
                section === "books"
                  ? "bg-white shadow-sm"
                  : "text-black/45"
              }
            `}
          >
            Reading
          </button>

          <button
            type="button"
            onClick={() =>
              changeSection(
                "media"
              )
            }
            className={`
              rounded-xl
              py-2.5
              text-sm
              font-medium
              ${
                section === "media"
                  ? "bg-white shadow-sm"
                  : "text-black/45"
              }
            `}
          >
            Watching
          </button>

        </div>

        <form
          onSubmit={submit}
          className="mt-6 space-y-5"
        >

          {/* TYPE */}

          <div>

            <label className="mb-2 block text-sm font-medium">
              Type
            </label>

            <select
              value={type}
              onChange={(e) =>
                setType(
                  e.target.value
                )
              }
              className="
                w-full
                rounded-xl
                border border-black/10
                px-3 py-3
                outline-none
              "
            >

              {section ===
              "books" ? (
                <>
                  <option value="book">
                    Book
                  </option>

                  <option value="article">
                    Article
                  </option>
                </>
              ) : (
                <>
                  <option value="movie">
                    Movie
                  </option>

                  <option value="series">
                    Series
                  </option>
                </>
              )}

            </select>

          </div>

          {/* TITLE */}

          <Input
            label={
              <>
                Title
                <span className="ml-1 text-red-500">
                  *
                </span>
              </>
            }
            value={form.title}
            onChange={(value) =>
              update(
                "title",
                value
              )
            }
            placeholder={
              section === "books"
                ? "Enter book or article title"
                : "Enter movie or series title"
            }
          />

          {/* AUTHOR / DIRECTOR */}

          <Input
            label={
              section === "books"
                ? "Author"
                : "Director / Creator"
            }
            value={
              section === "books"
                ? form.author
                : form.director
            }
            onChange={(value) =>
              update(
                section === "books"
                  ? "author"
                  : "director",
                value
              )
            }
            placeholder="Optional"
          />

          {/* GENRE + RATING */}

          <div className="grid gap-5 sm:grid-cols-2">

            <Input
              label="Genre"
              value={form.genre}
              onChange={(value) =>
                update(
                  "genre",
                  value
                )
              }
              placeholder="e.g. Fiction, Sci-Fi"
            />

            <div>

              <label className="mb-2 block text-sm font-medium">
                Rating
              </label>

              <select
                value={form.rating}
                onChange={(e) =>
                  update(
                    "rating",
                    e.target.value
                  )
                }
                className="
                  w-full
                  rounded-xl
                  border border-black/10
                  px-3 py-3
                  outline-none
                "
              >

                <option value="">
                  Not Rated
                </option>

                {Array.from(
                  {
                    length: 10,
                  },
                  (_, index) =>
                    (index + 1) /
                    2
                ).map(
                  (rating) => (
                    <option
                      key={rating}
                      value={rating}
                    >
                      {rating.toFixed(
                        1
                      )}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

          {/* STATUS */}

          <div>

            <label className="mb-2 block text-sm font-medium">
              Status
            </label>

            <select
              value={form.status}
              onChange={(e) =>
                update(
                  "status",
                  e.target.value
                )
              }
              className="
                w-full
                rounded-xl
                border border-black/10
                px-3 py-3
                outline-none
              "
            >

              {statuses.map(
                (status) => (
                  <option
                    key={
                      status.value
                    }
                    value={
                      status.value
                    }
                  >
                    {status.label}
                  </option>
                )
              )}

            </select>

          </div>

          {/* LINK */}

          <Input
            label="External Link"
            value={form.link}
            onChange={(value) =>
              update(
                "link",
                value
              )
            }
            placeholder="Optional"
          />

          {/* NOTES */}

          <div>

            <label className="mb-2 block text-sm font-medium">
              Notes
            </label>

            <textarea
              value={form.notes}
              onChange={(e) =>
                update(
                  "notes",
                  e.target.value
                )
              }
              rows={4}
              className="
                w-full
                resize-none
                rounded-xl
                border border-black/10
                px-3 py-3
                outline-none
              "
              placeholder="Optional notes..."
            />

          </div>

          {/* FAVORITE */}

          <label className="
            flex cursor-pointer
            items-center gap-3
            rounded-xl
            border border-black/10
            p-3
          ">

            <input
              type="checkbox"
              checked={
                form.favorite
              }
              onChange={(e) =>
                update(
                  "favorite",
                  e.target.checked
                )
              }
            />

            <span className="text-sm">
              Add to favorites
            </span>

          </label>

          {/* BUTTONS */}

          <div className="
            flex justify-end
            gap-2
            border-t
            border-black/5
            pt-5
          ">

            <button
              type="button"
              onClick={onClose}
              className="
                rounded-xl
                px-4 py-2.5
                text-sm
                hover:bg-black/5
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                !form.title.trim()
              }
              className="
                rounded-xl
                bg-black
                px-5 py-2.5
                text-sm
                font-medium
                text-white
                disabled:cursor-not-allowed
                disabled:opacity-30
              "
            >
              Add Item
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

// =====================================================
// EDIT ITEM MODAL
// =====================================================

function EditItemModal({
  item,
  onClose,
  onSave,
}) {

  const [form, setForm] =
    useState({
      title: item.title || "",
      author: item.author || "",
      director: item.director || "",
      genre: item.genre || "",
      rating: item.rating || "",
      status: item.status || "",
      link: item.link || "",
      notes: item.notes || "",
      favorite: item.favorite || false,
    });

  const update = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    onSave({
      ...item,

      title:
        form.title.trim(),

      ...(item.section === "books"
        ? {
            author:
              form.author.trim(),
          }
        : {
            director:
              form.director.trim(),
          }),

      genre:
        form.genre.trim(),

      rating:
        form.rating
          ? Number(form.rating)
          : null,

      status:
        form.status,

      link:
        form.link.trim(),

      notes:
        form.notes.trim(),

      favorite:
        form.favorite,
    });
  };

  const statuses =
    item.section === "books"
      ? BOOK_STATUSES
      : MEDIA_STATUSES;

  return (
    <div className="
      fixed inset-0 z-50
      flex items-center
      justify-center
      bg-black/40
      p-4
      backdrop-blur-sm
    ">

      <div className="
        max-h-[90vh]
        w-full max-w-2xl
        overflow-y-auto
        rounded-3xl
        bg-white
        p-6
        shadow-2xl
        sm:p-8
      ">

        <div className="flex items-start justify-between">

          <div>

            <h2 className="text-2xl font-bold">
              Edit Item
            </h2>

            <p className="mt-1 text-sm text-black/40">
              Update your library item.
            </p>

          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-black/5"
          >
            <X size={20} />
          </button>

        </div>

        <form
          onSubmit={submit}
          className="mt-6 space-y-5"
        >

          {/* TITLE */}

          <Input
            label={
              <>
                Title
                <span className="ml-1 text-red-500">
                  *
                </span>
              </>
            }
            value={form.title}
            onChange={(value) =>
              update(
                "title",
                value
              )
            }
            placeholder="Enter title"
          />

          {/* AUTHOR / DIRECTOR */}

          <Input
            label={
              item.section === "books"
                ? "Author"
                : "Director / Creator"
            }
            value={
              item.section === "books"
                ? form.author
                : form.director
            }
            onChange={(value) =>
              update(
                item.section === "books"
                  ? "author"
                  : "director",
                value
              )
            }
            placeholder="Optional"
          />

          {/* GENRE + RATING */}

          <div className="grid gap-5 sm:grid-cols-2">

            <Input
              label="Genre"
              value={form.genre}
              onChange={(value) =>
                update(
                  "genre",
                  value
                )
              }
              placeholder="e.g. Fiction, Sci-Fi"
            />

            <div>

              <label className="mb-2 block text-sm font-medium">
                Rating
              </label>

              <select
                value={form.rating}
                onChange={(e) =>
                  update(
                    "rating",
                    e.target.value
                  )
                }
                className="
                  w-full
                  rounded-xl
                  border border-black/10
                  px-3 py-3
                  outline-none
                "
              >

                <option value="">
                  Not Rated
                </option>

                {Array.from(
                  {
                    length: 10,
                  },
                  (_, index) =>
                    (index + 1) /
                    2
                ).map(
                  (rating) => (
                    <option
                      key={rating}
                      value={rating}
                    >
                      {rating.toFixed(
                        1
                      )}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

          {/* STATUS */}

          <div>

            <label className="mb-2 block text-sm font-medium">
              Status
            </label>

            <select
              value={form.status}
              onChange={(e) =>
                update(
                  "status",
                  e.target.value
                )
              }
              className="
                w-full
                rounded-xl
                border border-black/10
                px-3 py-3
                outline-none
              "
            >

              {statuses.map(
                (status) => (
                  <option
                    key={
                      status.value
                    }
                    value={
                      status.value
                    }
                  >
                    {status.label}
                  </option>
                )
              )}

            </select>

          </div>

          {/* LINK */}

          <Input
            label="External Link"
            value={form.link}
            onChange={(value) =>
              update(
                "link",
                value
              )
            }
            placeholder="Optional"
          />

          {/* NOTES */}

          <div>

            <label className="mb-2 block text-sm font-medium">
              Notes
            </label>

            <textarea
              value={form.notes}
              onChange={(e) =>
                update(
                  "notes",
                  e.target.value
                )
              }
              rows={4}
              className="
                w-full
                resize-none
                rounded-xl
                border border-black/10
                px-3 py-3
                outline-none
              "
              placeholder="Optional notes..."
            />

          </div>

          {/* FAVORITE */}

          <label className="
            flex cursor-pointer
            items-center gap-3
            rounded-xl
            border border-black/10
            p-3
          ">

            <input
              type="checkbox"
              checked={
                form.favorite
              }
              onChange={(e) =>
                update(
                  "favorite",
                  e.target.checked
                )
              }
            />

            <span className="text-sm">
              Favorite
            </span>

          </label>

          {/* BUTTONS */}

          <div className="
            flex justify-end
            gap-2
            border-t
            border-black/5
            pt-5
          ">

            <button
              type="button"
              onClick={onClose}
              className="
                rounded-xl
                px-4 py-2.5
                text-sm
                hover:bg-black/5
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                !form.title.trim()
              }
              className="
                rounded-xl
                bg-black
                px-5 py-2.5
                text-sm
                font-medium
                text-white
                disabled:cursor-not-allowed
                disabled:opacity-30
              "
            >
              Save Changes
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

// =====================================================
// INPUT
// =====================================================

function Input({
  label,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder={placeholder}
        className="
          w-full
          rounded-xl
          border border-black/10
          px-3 py-3
          outline-none
          transition
          focus:border-black/30
        "
      />

    </div>
  );
}

// =====================================================
// GENRES
// =====================================================

function GenresPage({
  genres,
}) {
  return (
    <div>

      <div className="mb-7">

        <h1 className="text-3xl font-bold">
          Genres
        </h1>

        <p className="mt-2 text-sm text-black/45">
          Your library genres.
        </p>

      </div>

      {genres.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-wrap gap-2">

          {genres.map(
            (genre) => (
              <span
                key={genre}
                className="
                  rounded-full
                  border border-black/5
                  bg-white
                  px-4 py-2
                  text-sm
                "
              >
                {genre}
              </span>
            )
          )}

        </div>
      )}

    </div>
  );
}
