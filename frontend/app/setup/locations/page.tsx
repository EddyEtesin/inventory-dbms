'use client';

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Edit3,
  MapPin,
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

import { apiFetch } from '../../../lib/api';

type Location = {
  id: string;
  name: string;
  locationType: string;
  parentId: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  parent?: {
    id: string;
    name: string;
  } | null;
  children?: Location[];
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

const LOCATION_TYPES = [
  'STORE',
  'WAREHOUSE',
  'PHARMACY',
  'DEPARTMENT',
  'LABORATORY',
  'THEATRE',
  'WARD',
  'OFFICE',
  'OTHER',
];

export default function SetupLocationsPage() {
  const router = useRouter();

  const [organization, setOrganization] =
    useState<
      CurrentUserResponse['organization'] | null
    >(null);

  const [locations, setLocations] =
    useState<Location[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingLocations, setLoadingLocations] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [formError, setFormError] =
    useState('');

  const [showForm, setShowForm] =
    useState(false);

  const [editingLocation, setEditingLocation] =
    useState<Location | null>(null);

  const [name, setName] =
    useState('');

  const [locationType, setLocationType] =
    useState('');

  const [parentId, setParentId] =
    useState('');

  const [expanded, setExpanded] =
    useState<Record<string, boolean>>({});

  async function loadLocations() {
    try {
      setLoadingLocations(true);
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
          Location[] | { data: Location[] }
        >('/locations', token);

      const data = Array.isArray(response)
        ? response
        : response.data ?? [];

      setLocations(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load locations.',
      );
    } finally {
      setLoadingLocations(false);
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

        setOrganization(
          me.organization,
        );

        await loadLocations();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load organization setup.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadSetup();
  }, [router]);

  const rootLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          !location.parentId,
      ),
    [locations],
  );

  function resetForm() {
    setName('');
    setLocationType('');
    setParentId('');
    setFormError('');
    setEditingLocation(null);
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(
    location: Location,
  ) {
    setEditingLocation(location);
    setName(location.name);
    setLocationType(
      location.locationType,
    );
    setParentId(
      location.parentId ?? '',
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

    const trimmedType =
      locationType.trim();

    if (!trimmedName) {
      setFormError(
        'Enter a location name.',
      );
      return;
    }

    if (!trimmedType) {
      setFormError(
        'Select or enter a location type.',
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
        locationType:
          trimmedType.toLowerCase(),
        ...(parentId
          ? { parentId }
          : {}),
      };

      if (editingLocation) {
        await apiFetch(
          `/locations/${editingLocation.id}`,
          token,
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          },
        );
      } else {
        await apiFetch(
          '/locations',
          token,
          {
            method: 'POST',
            body: JSON.stringify(body),
          },
        );
      }

      await loadLocations();

      setShowForm(false);
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? extractApiError(
              err.message,
            )
          : 'Unable to save location.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteLocation(
    location: Location,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${location.name}"? This may fail if the location is already being used.`,
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
        `/locations/${location.id}`,
        token,
        {
          method: 'DELETE',
        },
      );

      await loadLocations();
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(
              err.message,
            )
          : 'Unable to delete location.',
      );
    }
  }

  function toggleExpanded(
    locationId: string,
  ) {
    setExpanded((current) => ({
      ...current,
      [locationId]:
        !current[locationId],
    }));
  }

  function getChildren(
    locationId: string,
  ) {
    return locations.filter(
      (location) =>
        location.parentId ===
        locationId,
    );
  }

  function renderLocation(
    location: Location,
    level = 0,
  ): React.ReactNode {
    const children =
      getChildren(location.id);

    const hasChildren =
      children.length > 0;

    const isExpanded =
      expanded[location.id] ??
      true;

    return (
      <div
        key={location.id}
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
                location.id,
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
                  ? 'Collapse location'
                  : 'Expand location'
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
            <MapPin
              size={14}
              strokeWidth={1.6}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px]">
                {location.name}
              </span>

              <span className="border border-[#b7a87e] px-1.5 py-0.5 font-mono text-[6px] tracking-widest text-[#5b5346]">
                {location.locationType.toUpperCase()}
              </span>
            </div>

            <div className="mt-0.5 font-mono text-[7px] text-[#5b5346]">
              {children.length > 0
                ? `${children.length} ${
                    children.length === 1
                      ? 'SUB-LOCATION'
                      : 'SUB-LOCATIONS'
                  }`
                : 'NO SUB-LOCATIONS'}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() =>
                openEditForm(
                  location,
                )
              }
              className="border border-[#b7a87e] p-1.5 text-[#5b5346] hover:border-[#2e4057] hover:text-[#2e4057]"
              title="Edit location"
            >
              <Edit3
                size={12}
                strokeWidth={1.6}
              />
            </button>

            <button
              type="button"
              onClick={() =>
                deleteLocation(
                  location,
                )
              }
              className="border border-[#b7a87e] p-1.5 text-[#a63a2e] hover:border-[#a63a2e]"
              title="Delete location"
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
                  renderLocation(
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
    <main className="min-h-screen bg-[#ddd0b8] px-4 py-6 text-[#2b2620]">
      <div className="mx-auto max-w-[1150px]">

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
              LOCATION SETUP
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
                  SETUP · 01 / 04
                </div>

                <h1 className="mt-1 font-mono text-[28px] leading-tight">
                  Locations
                </h1>

                {organization ? (
                  <p className="mt-2 font-mono text-[9px] text-[#5b5346]">
                    Build the places where{' '}
                    <span className="text-[#2b2620]">
                      {organization.name}
                    </span>{' '}
                    keeps stock.
                  </p>
                ) : (
                  <p className="mt-2 font-mono text-[9px] text-[#5b5346]">
                    Create the places where your
                    organization keeps stock.
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
                ADD LOCATION
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
                    : organization?.name ??
                      '—'}
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

            {/* LOCATION LIST */}
            <div className="mt-6">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="font-mono text-[8px] text-[#5b5346]">
                    {locations.length}{' '}
                    TOTAL LOCATIONS
                  </div>

                  <h2 className="mt-1 font-mono text-[18px]">
                    LOCATION REGISTER
                  </h2>
                </div>

                {locations.length > 0 && (
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
                loadingLocations ? (
                  <div className="px-4 py-10 text-center font-mono text-[8px] text-[#5b5346]">
                    LOADING LOCATIONS...
                  </div>
                ) : rootLocations.length ===
                  0 ? (
                  <div className="px-5 py-10 text-center">
                    <MapPin
                      size={28}
                      strokeWidth={1.4}
                      className="mx-auto text-[#b7a87e]"
                    />

                    <div className="mt-3 font-mono text-[10px]">
                      No locations created yet.
                    </div>

                    <div className="mt-1 font-mono text-[8px] text-[#5b5346]">
                      Start by creating your main
                      store, warehouse, pharmacy or
                      department.
                    </div>

                    <button
                      type="button"
                      onClick={openCreateForm}
                      className="mt-4 border border-[#2b2620] px-4 py-2 font-mono text-[8px] tracking-widest hover:bg-[#2e4057] hover:text-[#f5f0e3]"
                    >
                      CREATE FIRST LOCATION
                    </button>
                  </div>
                ) : (
                  rootLocations.map(
                    (location) =>
                      renderLocation(
                        location,
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
                  Central Store
                  <br />
                  ↳ Pharmacy Store
                  <br />
                  ↳ Consumables Store
                  <br />
                  Emergency Department
                  <br />
                  Theatre Store
                </div>
              </div>

              <div className="border border-dashed border-[#b7a87e] p-4">
                <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                  HOW IT WORKS
                </div>

                <div className="mt-3 font-mono text-[8px] leading-5 text-[#5b5346]">
                  A parent location can contain
                  smaller stock locations. This lets
                  your organization mirror its real
                  storage structure.
                </div>
              </div>
            </div>

            {/* NAVIGATION */}
            <div className="mt-6 flex flex-col gap-2 border-t border-dashed border-[#b7a87e] pt-5 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/setup',
                  )
                }
                className="flex items-center justify-center gap-2 border border-[#2b2620] px-4 py-2.5 font-mono text-[8px] tracking-widest hover:bg-[#eae2ce]"
              >
                <ArrowLeft
                  size={14}
                  strokeWidth={1.7}
                />
                BACK TO SETUP
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/setup/suppliers',
                  )
                }
                className="flex items-center justify-center gap-2 border-2 border-[#2e4057] bg-[#2e4057] px-4 py-2.5 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620]"
              >
                NEXT · SUPPLIERS
                <ArrowRight
                  size={14}
                  strokeWidth={1.7}
                />
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-3 border-t border-dashed border-[#b7a87e] pt-2 font-mono text-[7px] text-[#5b5346]">
          <div className="flex justify-between">
            <span>
              INVENTORY LEDGER · LOCATION
              SETUP
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
            aria-label="Close location form"
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
                    LOCATION REGISTER
                  </div>

                  <h3 className="mt-1 font-mono text-[20px]">
                    {editingLocation
                      ? 'EDIT LOCATION'
                      : 'ADD LOCATION'}
                  </h3>

                  <p className="mt-1 font-mono text-[7px] text-[#5b5346]">
                    Define where inventory is
                    physically stored or managed.
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
                  LOCATION NAME
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
                  placeholder="e.g. Central Medical Store"
                  className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[11px] outline-none"
                  autoFocus
                  required
                />
              </div>

              {/* TYPE */}
              <div className="mt-5">
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                  LOCATION TYPE
                </label>

                <select
                  value={locationType}
                  onChange={(event) =>
                    setLocationType(
                      event.target.value,
                    )
                  }
                  className="w-full border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[10px] outline-none"
                  required
                >
                  <option value="">
                    SELECT TYPE
                  </option>

                  {LOCATION_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* PARENT */}
              <div className="mt-5">
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                  PARENT LOCATION
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

                  {locations
                    .filter(
                      (location) =>
                        location.id !==
                        editingLocation?.id,
                    )
                    .map(
                      (location) => (
                        <option
                          key={
                            location.id
                          }
                          value={
                            location.id
                          }
                        >
                          {location.name}
                        </option>
                      ),
                    )}
                </select>

                <div className="mt-1 font-mono text-[7px] text-[#5b5346]">
                  Choose a parent when this
                  location sits inside another
                  location.
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
                    : editingLocation
                      ? 'UPDATE LOCATION'
                      : 'CREATE LOCATION'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
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