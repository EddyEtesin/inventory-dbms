'use client';

import {
  Building2,
  ChevronDown,
  Edit3,
  MapPin,
  Plus,
  Search,
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

type Organization = {
  id: string;
  name: string;
  industryType: string;
  status: string;
};

type CurrentUserResponse = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  organization: Organization;
  role: {
    id: string;
    name: string;
  };
};

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

function extractApiError(message: string): string {
  try {
    const parsed = JSON.parse(message);

    if (Array.isArray(parsed?.message)) {
      return parsed.message.join(', ');
    }

    if (typeof parsed?.message === 'string') {
      return parsed.message;
    }

    if (typeof parsed?.error === 'string') {
      return parsed.error;
    }
  } catch {
    // Keep original message.
  }

  return message || 'Something went wrong.';
}

export default function LocationsPage() {
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);

  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [locations, setLocations] =
    useState<Location[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingLocations, setLoadingLocations] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [togglingStatus, setTogglingStatus] =
    useState<string | null>(null);

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

  const [search, setSearch] =
    useState('');

  const [expanded, setExpanded] =
    useState<Record<string, boolean>>({});

  async function loadLocations() {
    try {
      setLoadingLocations(true);
      setError('');

      const token =
        window.localStorage.getItem('accessToken');

      if (!token) {
        router.push('/login');
        return;
      }

      const response =
        await apiFetch<Location[] | { data: Location[] }>(
          '/locations',
          token,
        );

      const data = Array.isArray(response)
        ? response
        : response.data ?? [];

      setLocations(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to load locations.',
      );
    } finally {
      setLoadingLocations(false);
    }
  }

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        setError('');

        const token =
          window.localStorage.getItem('accessToken');

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

        await loadLocations();
      } catch (err) {
        setError(
          err instanceof Error
            ? extractApiError(err.message)
            : 'Unable to load locations.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [router]);

  const filteredLocations = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return locations;
    }

    return locations.filter(
      (location) =>
        location.name
          .toLowerCase()
          .includes(query) ||
        location.locationType
          .toLowerCase()
          .includes(query) ||
        location.status
          .toLowerCase()
          .includes(query),
    );
  }, [locations, search]);

  const rootLocations = useMemo(
    () =>
      filteredLocations.filter(
        (location) => !location.parentId,
      ),
    [filteredLocations],
  );

  const topLevelCount = useMemo(
    () =>
      locations.filter(
        (location) => !location.parentId,
      ).length,
    [locations],
  );

  const childCount =
    locations.length - topLevelCount;

  const activeCount = useMemo(
    () =>
      locations.filter(
        (location) =>
          location.status === 'active',
      ).length,
    [locations],
  );

  const inactiveCount =
    locations.length - activeCount;

  const industryLabel =
    organization?.industryType
      ? organization.industryType
          .replace(/_/g, ' ')
          .toUpperCase()
      : 'ORGANIZATION';

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

  function openEditForm(location: Location) {
    setEditingLocation(location);
    setName(location.name);
    setLocationType(
      location.locationType.toUpperCase(),
    );
    setParentId(location.parentId ?? '');
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
        'Select a location type.',
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
          ? extractApiError(err.message)
          : 'Unable to save location.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleLocationStatus(
    location: Location,
  ) {
    const isActive =
      location.status === 'active';

    const nextStatus = isActive
      ? 'inactive'
      : 'active';

    const actionText = isActive
      ? 'deactivate'
      : 'activate';

    const confirmed =
      window.confirm(
        `${actionText.charAt(0).toUpperCase()}${actionText.slice(1)} "${location.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setTogglingStatus(location.id);

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
          method: 'PATCH',
          body: JSON.stringify({
            status: nextStatus,
          }),
        },
      );

      await loadLocations();
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(err.message)
          : `Unable to ${actionText} location.`,
      );
    } finally {
      setTogglingStatus(null);
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
          ? extractApiError(err.message)
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
    return filteredLocations.filter(
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
      expanded[location.id] ?? true;

    const isActive =
      location.status === 'active';

    const isToggling =
      togglingStatus === location.id;

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

              {location.parentId && (
                <span className="border border-[#b7a87e] px-1.5 py-0.5 font-mono text-[6px] tracking-widest text-[#5b5346]">
                  SUB-LOCATION
                </span>
              )}

              <span
                className={`px-1.5 py-0.5 font-mono text-[6px] tracking-widest ${
                  isActive
                    ? 'border border-[#2e4057] bg-[#2e4057] text-[#f5f0e3]'
                    : 'border border-[#a63a2e] bg-[#a63a2e] text-[#f5f0e3]'
                }`}
              >
                {isActive
                  ? 'ACTIVE'
                  : 'INACTIVE'}
              </span>
            </div>

            <div className="mt-0.5 font-mono text-[7px] text-[#5b5346]">
              {children.length > 0
                ? `${children.length} ${
                    children.length === 1
                      ? 'SUB-LOCATION'
                      : 'SUB-LOCATIONS'
                  }`
                : location.parentId
                  ? 'CHILD LOCATION'
                  : 'TOP-LEVEL LOCATION'}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() =>
                toggleLocationStatus(
                  location,
                )
              }
              disabled={isToggling}
              className={`border px-2 py-1.5 font-mono text-[6px] tracking-widest disabled:cursor-wait disabled:opacity-50 ${
                isActive
                  ? 'border-[#a63a2e] text-[#a63a2e] hover:bg-[#a63a2e] hover:text-[#f5f0e3]'
                  : 'border-[#2e4057] bg-[#2e4057] text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620]'
              }`}
              title={
                isActive
                  ? 'Deactivate location'
                  : 'Activate location'
              }
            >
              {isToggling
                ? '...'
                : isActive
                  ? 'OFF'
                  : 'ON'}
            </button>

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

  return (
    <main className="min-h-screen bg-[#ddd0b8] text-[#2b2620]">
      <InventorySidebar
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed(
            (current) => !current,
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
            <header className="border border-[#b7a87e] bg-[#f5f0e3] px-5 py-4 shadow-[0_2px_0_#b7a87e,0_8px_20px_rgba(43,38,32,0.12)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-[8px] tracking-[0.18em] text-[#5b5346]">
                    INVENTORY MANAGEMENT SYSTEM
                  </div>

                  <div className="mt-1 font-mono text-[19px] tracking-[0.05em]">
                    INVENTORY LEDGER
                  </div>
                </div>

                <div className="hidden border-2 border-[#a63a2e] px-2.5 py-1 font-mono text-[7px] tracking-widest text-[#a63a2e] sm:block">
                  LOCATION REGISTER · {industryLabel}
                </div>
              </div>
            </header>

            <section className="relative mt-4 border border-[#b7a87e] bg-[#f5f0e3] p-5 shadow-[0_2px_0_#b7a87e,0_8px_20px_rgba(43,38,32,0.12)] md:p-7">
              <div className="pointer-events-none absolute inset-2 border border-dashed border-[#2b2620]/15" />

              <div className="relative">
                <div className="flex flex-col gap-4 border-b border-dashed border-[#b7a87e] pb-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
                      LOCATION REGISTER
                    </div>

                    <h1 className="mt-1 font-mono text-[28px] leading-tight">
                      Locations
                    </h1>

                    <p className="mt-2 max-w-[700px] font-mono text-[9px] leading-5 text-[#5b5346]">
                      Manage the physical locations where your organization stores or manages inventory.
                    </p>
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

                <div className="mt-5 grid gap-3 md:grid-cols-3">
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
                      TOTAL LOCATIONS
                    </div>

                    <div className="mt-1 font-mono text-[19px] text-[#c68a2e]">
                      {locations.length}
                    </div>

                    <div className="mt-2 font-mono text-[6px] tracking-widest text-[#ddd0b8]">
                      {activeCount} ACTIVE · {inactiveCount} INACTIVE
                    </div>
                  </div>

                  <div className="border border-[#b7a87e] p-4">
                    <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
                      STRUCTURE
                    </div>

                    <div className="mt-1 font-mono text-[11px]">
                      {topLevelCount} TOP LEVEL ·{' '}
                      {childCount} CHILD
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-5 border border-[#a63a2e] bg-[#a63a2e]/5 px-4 py-3">
                    <div className="font-mono text-[8px] text-[#a63a2e]">
                      {error}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3 border border-[#b7a87e] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
                      LOCATION REGISTER
                    </div>

                    <div className="mt-1 font-mono text-[11px]">
                      {filteredLocations.length}{' '}
                      {filteredLocations.length === 1
                        ? 'RECORD'
                        : 'RECORDS'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Search
                      size={13}
                      strokeWidth={1.6}
                      className="text-[#5b5346]"
                    />

                    <input
                      value={search}
                      onChange={(event) =>
                        setSearch(
                          event.target.value,
                        )
                      }
                      placeholder="SEARCH LOCATIONS..."
                      className="w-full border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[8px] outline-none placeholder:text-[#8a806f] sm:w-[280px]"
                    />
                  </div>
                </div>

                <div className="mt-4 overflow-hidden border border-[#b7a87e]">
                  {loading ||
                  loadingLocations ? (
                    <div className="px-4 py-12 text-center font-mono text-[9px] text-[#5b5346]">
                      LOADING LOCATION REGISTER...
                    </div>
                  ) : rootLocations.length ===
                    0 ? (
                    <div className="px-5 py-12 text-center">
                      <MapPin
                        size={30}
                        strokeWidth={1.4}
                        className="mx-auto text-[#b7a87e]"
                      />

                      <div className="mt-3 font-mono text-[10px]">
                        {search
                          ? 'No matching locations found.'
                          : 'No locations created yet.'}
                      </div>

                      {!search && (
                        <>
                          <div className="mt-1 font-mono text-[8px] text-[#5b5346]">
                            Create your first store,
                            warehouse, pharmacy or
                            department.
                          </div>

                          <button
                            type="button"
                            onClick={
                              openCreateForm
                            }
                            className="mt-4 border border-[#2b2620] px-4 py-2 font-mono text-[8px] tracking-widest hover:bg-[#2e4057] hover:text-[#f5f0e3]"
                          >
                            CREATE FIRST LOCATION
                          </button>
                        </>
                      )}
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

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="border border-dashed border-[#b7a87e] p-4">
                    <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                      LOCATION HIERARCHY
                    </div>

                    <div className="mt-3 font-mono text-[8px] leading-5 text-[#5b5346]">
                      A parent location can contain
                      smaller stock locations. Use
                      this structure to mirror the
                      physical organization of your
                      stores and departments.
                    </div>
                  </div>

                  <div className="border border-dashed border-[#b7a87e] p-4">
                    <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                      LOCATION STATUS
                    </div>

                    <div className="mt-3 font-mono text-[8px] leading-5 text-[#5b5346]">
                      Inactive locations remain visible
                      and preserve their existing
                      inventory assignments. New stock
                      operations are blocked until the
                      location is activated.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <footer className="mt-3 border-t border-dashed border-[#b7a87e] pt-2 font-mono text-[7px] text-[#5b5346]">
              <div className="flex justify-between gap-4">
                <span>
                  INVENTORY LEDGER · LOCATIONS
                </span>

                <span>
                  {organization?.name ??
                    'ORGANIZATION'}
                </span>
              </div>
            </footer>
          </div>
        </div>
      </div>

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
                    Define where inventory is physically stored or managed.
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

              {formError && (
                <div className="mt-4 border border-[#a63a2e] bg-[#a63a2e]/5 px-3 py-2.5 font-mono text-[8px] leading-4 text-[#a63a2e]">
                  {formError}
                </div>
              )}

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
                          key={location.id}
                          value={location.id}
                        >
                          {location.name}
                        </option>
                      ),
                    )}
                </select>

                <div className="mt-1 font-mono text-[7px] text-[#5b5346]">
                  Choose a parent when this location sits inside another location.
                </div>
              </div>

              <div className="mt-6 flex gap-2 border-t border-dashed border-[#b7a87e] pt-5">
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