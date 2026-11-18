import { useEffect, useRef, useState } from "react";

import {
  Plus,
  Heart,
  Home,
  ShoppingBag,
  Check,
  Settings,
  Trash2,
  MoreVertical,
  X,
  ExternalLink,
  Pencil,
  Search,
  RefreshCw,
  Lock,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react";

/*
==================================================
FRONTEND PIN
==================================================

IMPORTANT:

This is intentionally frontend-only protection.

It is NOT secure authentication.

Anyone technically inspecting the JavaScript
could discover this PIN.

For a personal wishlist / casual protection,
this is fine.

Change this to your own PIN.
*/

const APP_PIN = "170302";

const SESSION_KEY =
  "wishlist_frontend_unlocked";

function App() {
  // ==================================================
  // PIN / LOCK
  // ==================================================

  const [unlocked, setUnlocked] =
    useState(() => {
      return (
        sessionStorage.getItem(
          SESSION_KEY
        ) === "true"
      );
    });

  const [pin, setPin] =
    useState("");

  const [pinError, setPinError] =
    useState("");

  const [showPin, setShowPin] =
    useState(false);

  // ==================================================
  // DATA
  // ==================================================

  const [items, setItems] =
    useState([]);

  const [categories, setCategories] =
    useState([]);

  // ==================================================
  // STATUS
  // ==================================================

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [syncing, setSyncing] =
    useState(false);

  const [error, setError] =
    useState("");

  // ==================================================
  // MODALS
  // ==================================================

  const [showModal, setShowModal] =
    useState(false);

  const [
    showCategoryModal,
    setShowCategoryModal,
  ] = useState(false);

  const [editingItem, setEditingItem] =
    useState(null);

  const [openMenu, setOpenMenu] =
    useState(null);

  // ==================================================
  // FORM
  // ==================================================

  const [form, setForm] = useState({
    name: "",
    category: "",
    priority: "Medium",
    price: "",
    shoppingLink: "",
    notes: "",
  });

  const [newCategory, setNewCategory] =
    useState("");

  // ==================================================
  // FILTERS
  // ==================================================

  const [search, setSearch] =
    useState("");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState("All");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("All");

  const [
    purchaseFilter,
    setPurchaseFilter,
  ] = useState("All");

  // ==================================================
  // SYNC INTERVAL
  // ==================================================

  const syncIntervalRef =
    useRef(null);

  // ==================================================
  // PIN HANDLING
  // ==================================================

  const handlePinSubmit = (e) => {
    e.preventDefault();

    if (pin === APP_PIN) {
      sessionStorage.setItem(
        SESSION_KEY,
        "true"
      );

      setUnlocked(true);
      setPin("");
      setPinError("");
    } else {
      setPinError(
        "Incorrect PIN. Please try again."
      );

      setPin("");
    }
  };

  const lockApp = () => {
    sessionStorage.removeItem(
      SESSION_KEY
    );

    setUnlocked(false);

    setItems([]);

    setPin("");
    setPinError("");

    if (syncIntervalRef.current) {
      clearInterval(
        syncIntervalRef.current
      );
    }
  };

  // ==================================================
  // OPERATION ID
  // ==================================================

  const createOperationId = () => {
    if (
      typeof crypto !== "undefined" &&
      crypto.randomUUID
    ) {
      return crypto.randomUUID();
    }

    return (
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .substring(2)
    );
  };

  // ==================================================
  // ITEM ID
  // ==================================================

  const createItemId = () => {
    if (
      typeof crypto !== "undefined" &&
      crypto.randomUUID
    ) {
      return crypto.randomUUID();
    }

    return (
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .substring(2)
    );
  };

  // ==================================================
  // INITIAL LOAD + AUTO SYNC
  // ==================================================

  useEffect(() => {
    if (!unlocked) {
      return;
    }

    loadWishlist();

    syncIntervalRef.current =
      setInterval(() => {
        syncWishlist();
      }, 5000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(
          syncIntervalRef.current
        );
      }
    };
  }, [unlocked]);

  // ==================================================
  // LOAD WISHLIST
  // ==================================================

  const loadWishlist = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/wishlist",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load wishlist."
        );
      }

      const data =
        await response.json();

      setItems(
        Array.isArray(data.items)
          ? data.items
          : []
      );

      setCategories(
        Array.isArray(
          data.categories
        ) &&
          data.categories.length > 0
          ? data.categories
          : [
              "Electronics",
              "Clothing",
              "Books",
              "Beauty",
              "Home",
              "Other",
            ]
      );

      setError("");
    } catch (error) {
      console.error(error);

      setError(
        "Could not load your wishlist. Make sure your /api/wishlist endpoint is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // SYNC
  // ==================================================

  const syncWishlist = async () => {
    try {
      setSyncing(true);

      const response = await fetch(
        "/api/wishlist",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Sync failed."
        );
      }

      const data =
        await response.json();

      setItems(
        Array.isArray(data.items)
          ? data.items
          : []
      );

      setCategories(
        Array.isArray(
          data.categories
        )
          ? data.categories
          : []
      );

      setError("");
    } catch (error) {
      console.error(
        "Sync error:",
        error
      );
    } finally {
      setSyncing(false);
    }
  };

  // ==================================================
  // SEND OPERATION
  // ==================================================

  const sendOperation = async (
    operation
  ) => {
    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        "/api/wishlist",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            operation
          ),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to save."
        );
      }

      const data =
        await response.json();

      if (
        Array.isArray(data.items)
      ) {
        setItems(data.items);
      }

      if (
        Array.isArray(
          data.categories
        )
      ) {
        setCategories(
          data.categories
        );
      }
    } catch (error) {
      console.error(error);

      setError(
        "Could not save your changes."
      );

      await syncWishlist();
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // ADD / EDIT ITEM
  // ==================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    // -----------------------------------------------
    // EDIT
    // -----------------------------------------------

    if (editingItem) {
      const updatedItem = {
        ...editingItem,

        name:
          form.name.trim(),

        category:
          form.category ||
          "Other",

        priority:
          form.priority,

        price:
          Number(form.price) || 0,

        shoppingLink:
          form.shoppingLink.trim(),

        notes:
          form.notes.trim(),

        updatedAt:
          new Date().toISOString(),
      };

      setItems((current) =>
        current.map((item) =>
          item.id ===
          updatedItem.id
            ? updatedItem
            : item
        )
      );

      await sendOperation({
        id: createOperationId(),

        type: "UPDATE_ITEM",

        item: updatedItem,

        createdAt:
          new Date().toISOString(),
      });
    }

    // -----------------------------------------------
    // ADD
    // -----------------------------------------------

    else {
      const newItem = {
        id: createItemId(),

        name:
          form.name.trim(),

        category:
          form.category ||
          "Other",

        priority:
          form.priority,

        price:
          Number(form.price) || 0,

        shoppingLink:
          form.shoppingLink.trim(),

        notes:
          form.notes.trim(),

        purchased: false,

        createdAt:
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString(),
      };

      setItems((current) => [
        ...current,
        newItem,
      ]);

      await sendOperation({
        id: createOperationId(),

        type: "ADD_ITEM",

        item: newItem,

        createdAt:
          new Date().toISOString(),
      });
    }

    closeItemModal();
  };

  // ==================================================
  // DELETE ITEM
  // ==================================================

  const deleteItem = async (id) => {
    setItems((current) =>
      current.filter(
        (item) =>
          item.id !== id
      )
    );

    setOpenMenu(null);

    await sendOperation({
      id: createOperationId(),

      type: "DELETE_ITEM",

      itemId: id,

      createdAt:
        new Date().toISOString(),
    });
  };

  // ==================================================
  // TOGGLE PURCHASED
  // ==================================================

  const togglePurchased = async (
    id
  ) => {
    const existingItem =
      items.find(
        (item) =>
          item.id === id
      );

    if (!existingItem) {
      return;
    }

    const updatedItem = {
      ...existingItem,

      purchased:
        !existingItem.purchased,

      updatedAt:
        new Date().toISOString(),
    };

    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? updatedItem
          : item
      )
    );

    await sendOperation({
      id: createOperationId(),

      type: "UPDATE_ITEM",

      item: updatedItem,

      createdAt:
        new Date().toISOString(),
    });
  };

  // ==================================================
  // ADD CATEGORY
  // ==================================================

  const addCategory = async () => {
    const category =
      newCategory.trim();

    if (!category) {
      return;
    }

    const exists =
      categories.some(
        (item) =>
          item.toLowerCase() ===
          category.toLowerCase()
      );

    if (exists) {
      return;
    }

    setCategories((current) => [
      ...current,
      category,
    ]);

    setNewCategory("");

    await sendOperation({
      id: createOperationId(),

      type: "ADD_CATEGORY",

      category,

      createdAt:
        new Date().toISOString(),
    });
  };

  // ==================================================
  // DELETE CATEGORY
  // ==================================================

  const deleteCategory = async (
    category
  ) => {
    if (category === "Other") {
      return;
    }

    const affectedItems =
      items.filter(
        (item) =>
          item.category ===
          category
      );

    setCategories((current) =>
      current.filter(
        (item) =>
          item !== category
      )
    );

    setItems((current) =>
      current.map((item) =>
        item.category === category
          ? {
              ...item,
              category: "Other",
              updatedAt:
                new Date().toISOString(),
            }
          : item
      )
    );

    if (
      categoryFilter === category
    ) {
      setCategoryFilter("All");
    }

    for (const item of affectedItems) {
      const updatedItem = {
        ...item,

        category: "Other",

        updatedAt:
          new Date().toISOString(),
      };

      await sendOperation({
        id: createOperationId(),

        type: "UPDATE_ITEM",

        item: updatedItem,

        createdAt:
          new Date().toISOString(),
      });
    }

    await sendOperation({
      id: createOperationId(),

      type: "DELETE_CATEGORY",

      category,

      createdAt:
        new Date().toISOString(),
    });
  };

  // ==================================================
  // OPEN ADD MODAL
  // ==================================================

  const openAddModal = () => {
    setEditingItem(null);

    setForm({
      name: "",
      category: "",
      priority: "Medium",
      price: "",
      shoppingLink: "",
      notes: "",
    });

    setShowModal(true);
  };

  // ==================================================
  // OPEN EDIT MODAL
  // ==================================================

  const openEditModal = (item) => {
    setEditingItem(item);

    setForm({
      name: item.name || "",

      category:
        item.category || "",

      priority:
        item.priority ||
        "Medium",

      price:
        item.price || "",

      shoppingLink:
        item.shoppingLink ||
        "",

      notes:
        item.notes || "",
    });

    setShowModal(true);

    setOpenMenu(null);
  };

  // ==================================================
  // CLOSE ITEM MODAL
  // ==================================================

  const closeItemModal = () => {
    setShowModal(false);

    setEditingItem(null);

    setForm({
      name: "",
      category: "",
      priority: "Medium",
      price: "",
      shoppingLink: "",
      notes: "",
    });
  };

  // ==================================================
  // FORM CHANGE
  // ==================================================

  const handleChange = (e) => {
    setForm({
      ...form,

      [e.target.name]:
        e.target.value,
    });
  };

  // ==================================================
  // FILTERING
  // ==================================================

  const filteredItems =
    items.filter((item) => {
      const matchesSearch =
        item.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesPriority =
        priorityFilter === "All" ||
        item.priority ===
          priorityFilter;

      const matchesCategory =
        categoryFilter === "All" ||
        item.category ===
          categoryFilter;

      const matchesPurchase =
        purchaseFilter === "All" ||
        (purchaseFilter ===
          "Purchased" &&
          item.purchased) ||
        (purchaseFilter ===
          "Unpurchased" &&
          !item.purchased);

      return (
        matchesSearch &&
        matchesPriority &&
        matchesCategory &&
        matchesPurchase
      );
    });

  // ==================================================
  // STATS
  // ==================================================

  const purchased =
    items.filter(
      (item) => item.purchased
    ).length;

  const unpurchased =
    items.length -
    purchased;

  // ==================================================
  // FILTER HELPERS
  // ==================================================

  const clearFilters = () => {
    setSearch("");

    setPriorityFilter("All");

    setCategoryFilter("All");

    setPurchaseFilter("All");
  };

  const showPurchased = () => {
    setSearch("");

    setPriorityFilter("All");

    setCategoryFilter("All");

    setPurchaseFilter(
      "Purchased"
    );
  };

  const showUnpurchased = () => {
    setSearch("");

    setPriorityFilter("All");

    setCategoryFilter("All");

    setPurchaseFilter(
      "Unpurchased"
    );
  };

  // ==================================================
  // PIN SCREEN
  // ==================================================

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">

        <div className="w-full max-w-sm">

          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">

            {/* LOGO */}

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-white">

              <Heart
                size={30}
                fill="currentColor"
              />

            </div>

            {/* TITLE */}

            <div className="mt-6 text-center">

              <h1 className="text-2xl font-bold">
                My Wishlist
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Enter your PIN to continue
              </p>

            </div>

            {/* PIN FORM */}

            <form
              onSubmit={
                handlePinSubmit
              }
              className="mt-8"
            >

              <div className="relative">

                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type={
                    showPin
                      ? "text"
                      : "password"
                  }
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    const value =
                      e.target.value.replace(
                        /\D/g,
                        ""
                      );

                    setPin(value);
                    setPinError("");
                  }}
                  placeholder="Enter 6-digit PIN"
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 py-4 pl-11 pr-12 text-center text-lg tracking-[0.4em] outline-none focus:border-gray-400"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPin(
                      !showPin
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                >
                  {showPin ? (
                    <EyeOff
                      size={18}
                    />
                  ) : (
                    <Eye
                      size={18}
                    />
                  )}
                </button>

              </div>

              {pinError && (

                <p className="mt-3 text-center text-sm text-red-500">
                  {pinError}
                </p>

              )}

              <button
                type="submit"
                disabled={
                  pin.length === 0
                }
                className="mt-5 w-full rounded-xl bg-black py-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Unlock Wishlist
              </button>

            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
              Your wishlist is synced across your devices.
            </p>

          </div>

        </div>

      </div>
    );
  }

  // ==================================================
  // LOADING SCREEN
  // ==================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">

        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

          <p className="mt-4 text-sm text-gray-500">
            Loading your wishlist...
          </p>

        </div>

      </div>
    );
  }

  // ==================================================
  // MAIN UI
  // ==================================================

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">

      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-gray-200 bg-white p-6 md:block">

        <div className="mb-10 flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">

            <Heart
              size={20}
              fill="currentColor"
            />

          </div>

          <div>

            <h1 className="font-bold">
              My Wishlist
            </h1>

            <p className="text-xs text-gray-500">
              Personal collection
            </p>

          </div>

        </div>

        <nav className="space-y-2">

          <button
            onClick={
              clearFilters
            }
            className="flex w-full items-center gap-3 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white"
          >
            <Home size={18} />
            Overview
          </button>

          <button
            onClick={
              clearFilters
            }
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ShoppingBag
              size={18}
            />
            Wishlist
          </button>

          <button
            onClick={
              showPurchased
            }
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-600 hover:bg-gray-100"
          >
            <Check size={18} />
            Purchased
          </button>

          <button
            onClick={() =>
              setShowCategoryModal(
                true
              )
            }
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-600 hover:bg-gray-100"
          >
            <Settings
              size={18}
            />
            Categories
          </button>

        </nav>

        {/* LOCK */}

        <button
          onClick={lockApp}
          className="absolute bottom-6 left-6 right-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-500 hover:bg-gray-100"
        >
          <LogOut size={18} />
          Lock Wishlist
        </button>

      </aside>

      {/* ==================================================
          MOBILE NAV
      ================================================== */}

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden">

        <div className="grid grid-cols-4">

          <button
            onClick={
              clearFilters
            }
            className="flex flex-col items-center gap-1 px-2 py-3 text-gray-700"
          >
            <Home size={20} />

            <span className="text-[11px]">
              Home
            </span>
          </button>

          <button
            onClick={
              clearFilters
            }
            className="flex flex-col items-center gap-1 px-2 py-3 text-gray-500"
          >
            <ShoppingBag
              size={20}
            />

            <span className="text-[11px]">
              Wishlist
            </span>
          </button>

          <button
            onClick={
              openAddModal
            }
            className="flex flex-col items-center gap-1 px-2 py-3 text-gray-500"
          >

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
              <Plus size={20} />
            </div>

            <span className="text-[11px]">
              Add
            </span>

          </button>

          <button
            onClick={() =>
              setShowCategoryModal(
                true
              )
            }
            className="flex flex-col items-center gap-1 px-2 py-3 text-gray-500"
          >
            <Settings
              size={20}
            />

            <span className="text-[11px]">
              Categories
            </span>
          </button>

        </div>

      </nav>

      {/* ==================================================
          MAIN
      ================================================== */}

      <main className="pb-20 md:ml-64 md:pb-0">

        {/* HEADER */}

        <header className="border-b border-gray-200 bg-white">

          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">

            <div className="flex items-center justify-between gap-4">

              <div>

                <h2 className="text-xl font-bold sm:text-2xl">
                  Overview
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Keep track of everything you want.
                </p>

              </div>

              <div className="flex items-center gap-3">

                <button
                  onClick={
                    syncWishlist
                  }
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600 hover:bg-gray-50"
                >

                  <RefreshCw
                    size={17}
                    className={
                      syncing
                        ? "animate-spin"
                        : ""
                    }
                  />

                  <span className="hidden lg:inline">
                    Sync
                  </span>

                </button>

                {saving && (

                  <span className="hidden text-xs text-gray-400 sm:block">
                    Saving...
                  </span>

                )}

                <button
                  onClick={
                    openAddModal
                  }
                  className="flex items-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
                >

                  <Plus size={18} />

                  <span className="hidden sm:inline">
                    Add Item
                  </span>

                </button>

              </div>

            </div>

          </div>

        </header>

        {/* ERROR */}

        {error && (

          <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">

            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>

          </div>

        )}

        {/* ==================================================
            CONTENT
        ================================================== */}

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">

          {/* STATS */}

          <div className="grid grid-cols-3 gap-2 sm:gap-4">

            <button
              onClick={
                clearFilters
              }
              className="rounded-2xl border border-gray-200 bg-white p-4 text-left hover:shadow-sm sm:p-5"
            >

              <p className="text-xs text-gray-500 sm:text-sm">
                Total
              </p>

              <p className="mt-2 text-2xl font-bold sm:text-3xl">
                {items.length}
              </p>

            </button>

            <button
              onClick={
                showUnpurchased
              }
              className="rounded-2xl border border-gray-200 bg-white p-4 text-left hover:shadow-sm sm:p-5"
            >

              <p className="text-xs text-gray-500 sm:text-sm">
                Unpurchased
              </p>

              <p className="mt-2 text-2xl font-bold sm:text-3xl">
                {unpurchased}
              </p>

            </button>

            <button
              onClick={
                showPurchased
              }
              className="rounded-2xl border border-gray-200 bg-white p-4 text-left hover:shadow-sm sm:p-5"
            >

              <p className="text-xs text-gray-500 sm:text-sm">
                Purchased
              </p>

              <p className="mt-2 text-2xl font-bold sm:text-3xl">
                {purchased}
              </p>

            </button>

          </div>

          {/* SEARCH + FILTERS */}

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 sm:mt-8">

            <div className="relative">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search your wishlist..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-gray-400 focus:bg-white"
              />

            </div>

            <div className="mt-4 flex flex-wrap gap-2">

              {[
                "All",
                "High",
                "Medium",
                "Low",
              ].map(
                (priority) => (

                  <button
                    key={priority}
                    onClick={() =>
                      setPriorityFilter(
                        priority
                      )
                    }
                    className={`rounded-xl px-4 py-2 text-sm font-medium ${
                      priorityFilter ===
                      priority
                        ? "bg-black text-white"
                        : "border border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    {priority}
                  </button>

                )
              )}

            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">

              <select
                value={
                  categoryFilter
                }
                onChange={(e) =>
                  setCategoryFilter(
                    e.target.value
                  )
                }
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              >

                <option value="All">
                  All Categories
                </option>

                {categories.map(
                  (category) => (

                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>

                  )
                )}

              </select>

              <select
                value={
                  purchaseFilter
                }
                onChange={(e) =>
                  setPurchaseFilter(
                    e.target.value
                  )
                }
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              >

                <option value="All">
                  All Items
                </option>

                <option value="Purchased">
                  Purchased
                </option>

                <option value="Unpurchased">
                  Unpurchased
                </option>

              </select>

              <button
                onClick={
                  clearFilters
                }
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600"
              >
                Clear
              </button>

            </div>

          </div>

          {/* ==================================================
              WISHLIST
          ================================================== */}

          <div className="mt-8">

            <div className="mb-4 flex items-center justify-between">

              <h3 className="text-lg font-semibold">
                Your Wishlist
              </h3>

              <span className="text-sm text-gray-500">
                {filteredItems.length} items
              </span>

            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {filteredItems.map(
                (item) => (

                  <div
                    key={item.id}
                    className="relative rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-md"
                  >

                    <div className="flex items-start justify-between">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl">
                        🛍️
                      </div>

                      <div className="relative">

                        <button
                          onClick={() =>
                            setOpenMenu(
                              openMenu ===
                                item.id
                                ? null
                                : item.id
                            )
                          }
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                        >
                          <MoreVertical
                            size={18}
                          />
                        </button>

                        {openMenu ===
                          item.id && (

                          <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">

                            <button
                              onClick={() =>
                                openEditModal(
                                  item
                                )
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
                            >

                              <Pencil
                                size={15}
                              />

                              Edit

                            </button>

                            {item.shoppingLink && (

                              <a
                                href={
                                  item.shoppingLink
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
                              >

                                <ExternalLink
                                  size={15}
                                />

                                Open Product

                              </a>

                            )}

                            <button
                              onClick={() =>
                                deleteItem(
                                  item.id
                                )
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >

                              <Trash2
                                size={15}
                              />

                              Delete

                            </button>

                          </div>

                        )}

                      </div>

                    </div>

                    <div className="mt-5">

                      <h4 className="font-semibold">
                        {item.name}
                      </h4>

                      <p className="mt-1 text-sm text-gray-500">
                        {item.category}
                      </p>

                    </div>

                    <div className="mt-4 flex items-center justify-between">

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          item.priority ===
                          "High"
                            ? "bg-red-50 text-red-600"
                            : item.priority ===
                              "Medium"
                            ? "bg-yellow-50 text-yellow-600"
                            : "bg-green-50 text-green-600"
                        }`}
                      >
                        {item.priority}
                      </span>

                      <span className="font-semibold">
                        ₹
                        {Number(
                          item.price ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </span>

                    </div>

                    {item.shoppingLink && (

                      <a
                        href={
                          item.shoppingLink
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600"
                      >

                        <ExternalLink
                          size={16}
                        />

                        View Product

                      </a>

                    )}

                    {item.notes && (

                      <p className="mt-3 line-clamp-2 text-sm text-gray-500">
                        {item.notes}
                      </p>

                    )}

                    <div className="mt-5 border-t border-gray-100 pt-4">

                      <button
                        onClick={() =>
                          togglePurchased(
                            item.id
                          )
                        }
                        className={`flex items-center gap-2 text-sm font-medium ${
                          item.purchased
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >

                        <Check size={17} />

                        {item.purchased
                          ? "Purchased"
                          : "Mark as purchased"}

                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

            {filteredItems.length ===
              0 && (

              <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">

                <Search
                  size={24}
                  className="mx-auto text-gray-400"
                />

                <h3 className="mt-4 font-semibold">
                  No items found
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Add something to your wishlist.
                </p>

                <button
                  onClick={
                    openAddModal
                  }
                  className="mt-4 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white"
                >
                  Add Item
                </button>

              </div>

            )}

          </div>

        </div>

      </main>

      {/* ==================================================
          ADD / EDIT MODAL
      ================================================== */}

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white">

            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">

              <div>

                <h2 className="text-lg font-semibold">

                  {editingItem
                    ? "Edit Item"
                    : "Add to Wishlist"}

                </h2>

                <p className="text-sm text-gray-500">
                  Add the details below.
                </p>

              </div>

              <button
                onClick={
                  closeItemModal
                }
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5 p-6"
            >

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Item Name
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Sony WH-1000XM5"
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                />

              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-medium">
                    Category
                  </label>

                  <select
                    name="category"
                    value={
                      form.category
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
                  >

                    <option value="">
                      Select category
                    </option>

                    {categories.map(
                      (category) => (

                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>

                      )
                    )}

                  </select>

                </div>

                <div>

                  <label className="mb-2 block text-sm font-medium">
                    Priority
                  </label>

                  <select
                    name="priority"
                    value={
                      form.priority
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
                  >

                    <option value="High">
                      High
                    </option>

                    <option value="Medium">
                      Medium
                    </option>

                    <option value="Low">
                      Low
                    </option>

                  </select>

                </div>

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Price
                </label>

                <input
                  name="price"
                  type="number"
                  min="0"
                  value={
                    form.price
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="29999"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Shopping Link
                </label>

                <input
                  name="shoppingLink"
                  type="url"
                  value={
                    form.shoppingLink
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="https://amazon.in/..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Notes
                </label>

                <textarea
                  name="notes"
                  rows="3"
                  value={
                    form.notes
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Additional notes..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm"
                />

              </div>

              <div className="flex justify-end gap-3">

                <button
                  type="button"
                  onClick={
                    closeItemModal
                  }
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
                >

                  {saving
                    ? "Saving..."
                    : editingItem
                    ? "Save Changes"
                    : "Add Item"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ==================================================
          CATEGORY MODAL
      ================================================== */}

      {showCategoryModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-md rounded-2xl bg-white">

            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">

              <div>

                <h2 className="text-lg font-semibold">
                  Categories
                </h2>

                <p className="text-sm text-gray-500">
                  Manage categories.
                </p>

              </div>

              <button
                onClick={() =>
                  setShowCategoryModal(
                    false
                  )
                }
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={20} />
              </button>

            </div>

            <div className="p-6">

              <div className="flex gap-2">

                <input
                  value={
                    newCategory
                  }
                  onChange={(e) =>
                    setNewCategory(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key ===
                      "Enter"
                    ) {
                      e.preventDefault();

                      addCategory();
                    }
                  }}
                  placeholder="New category..."
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm"
                />

                <button
                  onClick={
                    addCategory
                  }
                  className="rounded-xl bg-black px-4 text-white"
                >
                  <Plus size={18} />
                </button>

              </div>

              <div className="mt-5 space-y-2">

                {categories.map(
                  (category) => (

                    <div
                      key={category}
                      className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                    >

                      <span className="text-sm font-medium">
                        {category}
                      </span>

                      {category !==
                        "Other" && (

                        <button
                          onClick={() =>
                            deleteCategory(
                              category
                            )
                          }
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >

                          <Trash2
                            size={16}
                          />

                        </button>

                      )}

                    </div>

                  )
                )}

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;