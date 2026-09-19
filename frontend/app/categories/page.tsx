'use client';

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Edit3,
  FolderTree,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import InventorySidebar from '../../components/inventory/InventorySidebar';

import { apiFetch } from '../../lib/api';

type Category = {
  id: string;
  name: string;
  parentId: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  parent?: {
    id: string;
    name: string;
  } | null;
  children?: Category[];
};

type CurrentUserResponse = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  organization: {
    id: string;
    name: string;
    industryType: string;
    status: string;
  };
  role: {
    id: string;
    name: string;
  };
};

export default function CategoriesPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const [organization, setOrganization] =
    useState<
      CurrentUserResponse['organization'] | null
    >(null);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingCategories, setLoadingCategories] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [formError, setFormError] =
    useState('');

  const [showForm, setShowForm] =
    useState(false);

  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  const [name, setName] =
    useState('');

  const [parentId, setParentId] =
    useState('');

  const [expanded, setExpanded] =
    useState<Record<string, boolean>>({});

  async function loadCategories() {
    try {
      setLoadingCategories(true);
      setError('');

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        router.push('/login');
        return;
      }

      const response =
        await apiFetch<
          Category[] | { data: Category[] }
        >('/categories', token);

      const data = Array.isArray(response)
        ? response
        : response.data ?? [];

      setCategories(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to load categories.',
      );
    } finally {
      setLoadingCategories(false);
    }
  }

  useEffect(() => {
    async function loadSetup() {
      try {
        setLoading(true);
        setError('');

        const token =
          window.localStorage.getItem(
            'accessToken',
          );

        if (!token) {
          router.push('/login');
          return;
        }

        const me =
          await apiFetch<CurrentUserResponse>(
            '/auth/me',
            token,
          );

        setOrganization(me.organization);

        await loadCategories();
      } catch (err) {
        setError(
          err instanceof Error
            ? extractApiError(err.message)
            : 'Unable to load organization setup.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadSetup();
  }, [router]);

  const rootCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          !category.parentId,
      ),
    [categories],
  );

  function resetForm() {
    setName('');
    setParentId('');
    setFormError('');
    setEditingCategory(null);
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(
    category: Category,
  ) {
    setEditingCategory(category);
    setName(category.name);
    setParentId(
      category.parentId ?? '',
    );
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    resetForm();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedName =
      name.trim();

    if (!trimmedName) {
      setFormError(
        'Enter a category name.',
      );
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        router.push('/login');
        return;
      }

      const body = {
        name: trimmedName,
        ...(parentId
          ? { parentId }
          : {}),
      };

      if (editingCategory) {
        await apiFetch(
          `/categories/${editingCategory.id}`,
          token,
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          },
        );
      } else {
        await apiFetch(
          '/categories',
          token,
          {
            method: 'POST',
            body: JSON.stringify(body),
          },
        );
      }

      await loadCategories();

      setShowForm(false);
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to save category.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(
    category: Category,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${category.name}"? This may fail if the category or its children are already being used.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError('');

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        router.push('/login');
        return;
      }

      await apiFetch(
        `/categories/${category.id}`,
        token,
        {
          method: 'DELETE',
        },
      );

      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to delete category.',
      );
    }
  }

  function toggleExpanded(
    categoryId: string,
  ) {
    setExpanded((current) => ({
      ...current,
      [categoryId]:
        !current[categoryId],
    }));
  }

  function getChildren(
    categoryId: string,
  ) {
    return categories.filter(
      (category) =>
        category.parentId ===
        categoryId,
    );
  }

  function renderCategory(
    category: Category,
    level = 0,
  ): React.ReactNode {
    const children =
      getChildren(category.id);

    const hasChildren =
      children.length > 0;

    const isExpanded =
      expanded[category.id] ??
      true;

    return (
      <div
        key={category.id}
        className="border-b border-dashed border-[#b7a87e] last:border-b-0"
      >
        <div
          className="flex items-center gap-3 px-4 py-3 hover:bg-[#eae2ce]"
          style={{
            paddingLeft:
              `${16 + level * 26}px`,
          }}
        >
          <button
            type="button"
            onClick={() =>
              hasChildren &&
              toggleExpanded(
                category.id,
              )
            }
            className={`flex h-5 w-5 shrink-0 items-center justify-center ${
              hasChildren
                ? 'text-[#2e4057]'
                : 'text-transparent'
            }`}
            aria-label={
              hasChildren
                ? isExpanded
                  ? 'Collapse category'
                  : 'Expand category'
                : undefined
            }
          >
            {hasChildren && (
              <ChevronDown
                size={13}
                strokeWidth={1.7}
                className={
                  isExpanded
                    ? ''
                    : '-rotate-90'
                }
              />
            )}
          </button>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#2e4057] text-[#2e4057]">
            <FolderTree
              size={14}
              strokeWidth={1.6}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px]">
                {category.name}
              </span>

              <span className="border border-[#b7a87e] px-1.5 py-0.5 font-mono text-[6px] tracking-widest text-[#5b5346]">
                {category.parentId
                  ? 'SUBCATEGORY'
                  : 'TOP LEVEL'}
              </span>
            </div>

            <div className="mt-0.5 font-mono text-[7px] text-[#5b5346]">
              {children.length > 0
                ? `${children.length} ${
                    children.length === 1
                      ? 'SUBCATEGORY'
                      : 'SUBCATEGORIES'
                  }`
                : 'NO SUBCATEGORIES'}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() =>
                openEditForm(
                  category,
                )
              }
              className="border border-[#b7a87e] p-1.5 text-[#5b5346] hover:border-[#2e4057] hover:text-[#2e4057]"
              title="Edit category"
            >
              <Edit3
                size={12}
                strokeWidth={1.6}
              />
            </button>

            <button
              type="button"
              onClick={() =>
                deleteCategory(
                  category,
                )
              }
              className="border border-[#b7a87e] p-1.5 text-[#a63a2e] hover:border-[#a63a2e]"
              title="Delete category"
            >
              <Trash2
                size={12}
                strokeWidth={1.6}
              />
            </button>
          </div>
        </div>

        {hasChildren &&
          isExpanded && (
            <div>
              {children.map(
                (child) =>
                  renderCategory(
                    child,
                    level + 1,
                  ),
              )}
            </div>
          )}
      </div>
    );
  }

  const industryLabel =
    organization?.industryType
      ? organization.industryType
          .replace(/_/g, ' ')
          .toUpperCase()
      : 'ORGANIZATION';

  return (
    <main className="min-h-screen bg-[#ddd0b8] text-[#2b2620]">
      <InventorySidebar
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed(
            (current) =>
              !current,
          )
        }
      />

      <div
        className={`min-h-screen ${
          collapsed
            ? 'md:pl-[68px]'
            : 'md:pl-[205px]'
        }`}
      >
        <div className="p-3 md:p-5">
          <div className="mx-auto max-w-[1250px]">

        {/* HEADER */}
        <header className="border border-[#b7a87e] bg-[#f5f0e3] px-5 py-4 shadow-[0_2px_0_#b7a87e,0_8px_20px_rgba(43,38,32,0.12)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[8px] tracking-[0.18em] text-[#5b5346]">
                INVENTORY MANAGEMENT SYSTEM
              </div>

              <div className="mt-1 font-mono text-[19px] tracking-[0.05em]">
                INVENTORY LEDGER
              </div>
            </div>

            <div className="hidden border-2 border-[#a63a2e] px-2.5 py-1 font-mono text-[7px] tracking-widest text-[#a63a2e] sm:block">
              CATEGORY REGISTER · {industryLabel}
            </div>
          </div>
        </header>

        {/* MAIN PAPER */}
        <section className="relative mt-4 border border-[#b7a87e] bg-[#f5f0e3] p-5 shadow-[0_2px_0_#b7a87e,0_8px_20px_rgba(43,38,32,0.12)] md:p-7">
          <div className="pointer-events-none absolute inset-2 border border-dashed border-[#2b2620]/15" />

          <div className="relative">

            {/* TITLE */}
            <div className="flex flex-col gap-4 border-b border-dashed border-[#b7a87e] pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
                  CATEGORY REGISTER
                </div>

                <h1 className="mt-1 font-mono text-[28px] leading-tight">
                  Categories
                </h1>

                {organization ? (
                  <p className="mt-2 font-mono text-[9px] text-[#5b5346]">
                    Manage the inventory classification
                    structure for{' '}
                    <span className="text-[#2b2620]">
                      {organization.name}
                    </span>
                    .
                  </p>
                ) : (
                  <p className="mt-2 font-mono text-[9px] text-[#5b5346]">
                    Create the categories used to
                    organize your inventory.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={openCreateForm}
                className="flex items-center justify-center gap-2 border-2 border-[#2e4057] bg-[#2e4057] px-4 py-2.5 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620]"
              >
                <Plus
                  size={14}
                  strokeWidth={1.7}
                />
                ADD CATEGORY
              </button>
            </div>

            {/* ORGANIZATION STRIP */}
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_230px]">
              <div className="border border-[#b7a87e] p-4">
                <div className="flex items-center gap-2 font-mono text-[7px] tracking-widest text-[#5b5346]">
                  <Building2
                    size={13}
                    strokeWidth={1.6}
                  />
                  CURRENT ORGANIZATION
                </div>

                <div className="mt-1 font-mono text-[14px]">
                  {loading
                    ? 'LOADING...'
                    : organization?.name ?? '—'}
                </div>
              </div>

              <div className="border border-[#2e4057] bg-[#2e4057] p-4 text-[#f5f0e3]">
                <div className="font-mono text-[7px] tracking-widest text-[#ddd0b8]">
                  INDUSTRY
                </div>

                <div className="mt-1 font-mono text-[13px] text-[#c68a2e]">
                  {industryLabel}
                </div>
              </div>
            </div>

            {/* ERROR */}
            {(error || formError) && (
              <div className="mt-4 border border-[#a63a2e] bg-[#a63a2e]/5 px-4 py-3">
                <div className="font-mono text-[8px] text-[#a63a2e]">
                  {formError || error}
                </div>
              </div>
            )}

            {/* CATEGORY LIST */}
            <div className="mt-6">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="font-mono text-[8px] text-[#5b5346]">
                    {categories.length}{' '}
                    TOTAL CATEGORIES
                  </div>

                  <h2 className="mt-1 font-mono text-[18px]">
                    CATEGORY REGISTER
                  </h2>
                </div>

                {categories.length > 0 && (
                  <div className="flex items-center gap-2 font-mono text-[7px] text-[#3d6b4f]">
                    <Check
                      size={13}
                      strokeWidth={1.7}
                    />
                    STRUCTURE CREATED
                  </div>
                )}
              </div>

              <div className="overflow-hidden border border-[#b7a87e]">
                {loading ||
                loadingCategories ? (
                  <div className="px-4 py-10 text-center font-mono text-[8px] text-[#5b5346]">
                    LOADING CATEGORIES...
                  </div>
                ) : rootCategories.length ===
                  0 ? (
                  <div className="px-5 py-10 text-center">
                    <FolderTree
                      size={28}
                      strokeWidth={1.4}
                      className="mx-auto text-[#b7a87e]"
                    />

                    <div className="mt-3 font-mono text-[10px]">
                      No categories created yet.
                    </div>

                    <div className="mt-1 font-mono text-[8px] text-[#5b5346]">
                      Start with broad groups such as
                      drugs, consumables, PPE or
                      laboratory supplies.
                    </div>

                    <button
                      type="button"
                      onClick={openCreateForm}
                      className="mt-4 border border-[#2b2620] px-4 py-2 font-mono text-[8px] tracking-widest hover:bg-[#2e4057] hover:text-[#f5f0e3]"
                    >
                      CREATE FIRST CATEGORY
                    </button>
                  </div>
                ) : (
                  rootCategories.map(
                    (category) =>
                      renderCategory(
                        category,
                      ),
                  )
                )}
              </div>
            </div>

            {/* HELP */}
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="border border-dashed border-[#b7a87e] p-4">
                <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                  EXAMPLE HOSPITAL STRUCTURE
                </div>

                <div className="mt-3 font-mono text-[8px] leading-5 text-[#5b5346]">
                  Drugs
                  <br />
                  ↳ Antibiotics
                  <br />
                  ↳ Analgesics
                  <br />
                  ↳ Antimalarials
                  <br />
                  Medical Consumables
                  <br />
                  ↳ Gloves
                  <br />
                  ↳ Syringes
                </div>
              </div>

              <div className="border border-dashed border-[#b7a87e] p-4">
                <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                  HOW IT WORKS
                </div>

                <div className="mt-3 font-mono text-[8px] leading-5 text-[#5b5346]">
                  A category can contain smaller
                  subcategories. This allows your
                  organization to classify inventory
                  at the level that makes sense for
                  its own operations.
                </div>
              </div>
            </div>
        </div>
      </section>

        {/* FOOTER */}
        <footer className="mt-3 border-t border-dashed border-[#b7a87e] pt-2 font-mono text-[7px] text-[#5b5346]">
          <div className="flex justify-between">
            <span>
              INVENTORY LEDGER · CATEGORIES
            </span>

            <span>
              {organization?.name ??
                'ORGANIZATION'}
            </span>
          </div>
        </footer>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <>
          <button
            type="button"
            aria-label="Close category form"
            onClick={closeForm}
            className="fixed inset-0 z-[60] bg-[#2b2620]/45"
          />

          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
            <form
              onSubmit={handleSubmit}
              className="my-auto w-full max-w-[500px] border border-[#2b2620] bg-[#f5f0e3] p-5 shadow-[8px_10px_0_rgba(43,38,32,0.18)]"
            >
              <div className="flex items-start justify-between border-b border-dashed border-[#b7a87e] pb-4">
                <div>
                  <div className="font-mono text-[7px] tracking-widest text-[#a63a2e]">
                    CATEGORY REGISTER
                  </div>

                  <h3 className="mt-1 font-mono text-[20px]">
                    {editingCategory
                      ? 'EDIT CATEGORY'
                      : 'ADD CATEGORY'}
                  </h3>

                  <p className="mt-1 font-mono text-[7px] text-[#5b5346]">
                    Define how inventory items will
                    be classified.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  aria-label="Close"
                  className="text-[#5b5346] hover:text-[#2b2620]"
                >
                  <X
                    size={18}
                    strokeWidth={1.7}
                  />
                </button>
              </div>

              {/* NAME */}
              <div className="mt-5">
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                  CATEGORY NAME
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                  maxLength={100}
                  placeholder="e.g. Medical Consumables"
                  className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[11px] outline-none"
                  autoFocus
                  required
                />
              </div>

              {/* PARENT */}
              <div className="mt-5">
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                  PARENT CATEGORY
                </label>

                <select
                  value={parentId}
                  onChange={(event) =>
                    setParentId(
                      event.target.value,
                    )
                  }
                  className="w-full border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[10px] outline-none"
                >
                  <option value="">
                    NONE · TOP LEVEL
                  </option>

                  {categories
                    .filter(
                      (category) =>
                        category.id !==
                        editingCategory?.id,
                    )
                    .map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {category.name}
                        </option>
                      ),
                    )}
                </select>

                <div className="mt-1 font-mono text-[7px] text-[#5b5346]">
                  Choose a parent when this category
                  belongs inside another category.
                </div>
              </div>

              {/* ERROR */}
              {formError && (
                <div className="mt-5 border border-[#a63a2e] bg-[#a63a2e]/5 px-3 py-2">
                  <div className="font-mono text-[8px] text-[#a63a2e]">
                    {formError}
                  </div>
                </div>
              )}

              {/* ACTIONS */}
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="flex-1 border border-[#2b2620] px-4 py-2.5 font-mono text-[8px] tracking-widest disabled:opacity-40"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 border-2 border-[#2e4057] bg-[#2e4057] px-4 py-2.5 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620] disabled:opacity-50"
                >
                  {saving
                    ? 'SAVING...'
                    : editingCategory
                      ? 'UPDATE CATEGORY'
                      : 'CREATE CATEGORY'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
        </div>
      </div>
    </main>
  );
}

function extractApiError(
  message: string,
) {
  try {
    const parsed =
      JSON.parse(message);

    if (
      Array.isArray(
        parsed.message,
      )
    ) {
      return parsed.message.join(
        ', ',
      );
    }

    if (
      typeof parsed.message ===
      'string'
    ) {
      return parsed.message;
    }
  } catch {
    // Keep the original message.
  }

  return message;
}

