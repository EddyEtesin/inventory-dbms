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
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { FormEvent, ReactNode } from 'react';

import { useRouter } from 'next/navigation';

import InventorySidebar from '../../components/inventory/InventorySidebar';
import { apiFetch } from '../../lib/api';
import { useAutoDismissMessage } from '../../hooks/useAutoDismissMessage';

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
    // Keep the original message.
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

  const [loading, setLoading] = useState(true);

  const [loadingLocations, setLoadingLocations] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [togglingStatus, setTogglingStatus] =
    useState<string | null>(null);

  const [error, setError] = useState('');

  const [formError, setFormError] = useState('');

  const [showForm, setShowForm] = useState(false);

  const [editingLocation, setEditingLocation] =
    useState<Location | null>(null);

  const [name, setName] = useState('');

  const [locationType, setLocationType] = useState('');

  const [parentId, setParentId] = useState('');

  const [search, setSearch] = useState('');

  const [expanded, setExpanded] =
    useState<Record<string, boolean>>({});

  useAutoDismissMessage(error, setError);

  // --------------------------------------------------
  // LOAD LOCATIONS
  // --------------------------------------------------

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

      const response = await apiFetch<
        Location[] | { data: Location[] }
      >('/locations', token);

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

  // --------------------------------------------------
  // INITIAL PAGE LOAD
  // --------------------------------------------------

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

        const me = await apiFetch<CurrentUserResponse>(
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

    void loadPage();
  }, [router]);

  // --------------------------------------------------
  // FILTER AND ORGANIZE LOCATIONS
  // --------------------------------------------------

  const filteredLocations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return locations;
    }

    return locations.filter(
      (location) =>
        location.name.toLowerCase().includes(query) ||
        location.locationType.toLowerCase().includes(query) ||
        location.status.toLowerCase().includes(query),
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

  const childCount = locations.length - topLevelCount;

  const activeCount = useMemo(
    () =>
      locations.filter(
        (location) => location.status === 'active',
      ).length,
    [locations],
  );

  const inactiveCount = locations.length - activeCount;

  const industryLabel = organization?.industryType
    ? organization.industryType
        .replace(/_/g, ' ')
        .toUpperCase()
    : 'ORGANIZATION';

  // --------------------------------------------------
  // FORM HANDLERS
  // --------------------------------------------------

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
    setLocationType(location.locationType.toUpperCase());
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

    const trimmedName = name.trim();
    const trimmedType = locationType.trim();

    if (!trimmedName) {
      setFormError('Enter a location name.');
      return;
    }

    if (!trimmedType) {
      setFormError('Select a location type.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const token =
        window.localStorage.getItem('accessToken');

      if (!token) {
        router.push('/login');
        return;
      }

      const body = {
        name: trimmedName,
        locationType: trimmedType.toLowerCase(),
        ...(parentId ? { parentId } : {}),
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
        await apiFetch('/locations', token, {
          method: 'POST',
          body: JSON.stringify(body),
        });
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

  // --------------------------------------------------
  // ACTIVATE / DEACTIVATE LOCATION
  // --------------------------------------------------

  async function toggleLocationStatus(
    location: Location,
  ) {
    const isActive = location.status === 'active';

    const nextStatus = isActive ? 'inactive' : 'active';

    const actionText = isActive ? 'deactivate' : 'activate';

    const confirmed = window.confirm(
      `${actionText.charAt(0).toUpperCase()}${actionText.slice(1)} "${location.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setTogglingStatus(location.id);

      const token =
        window.localStorage.getItem('accessToken');

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

  // --------------------------------------------------
  // DELETE LOCATION
  // --------------------------------------------------

  async function deleteLocation(location: Location) {
    const confirmed = window.confirm(
      `Delete "${location.name}"? This may fail if the location is already being used.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');

      const token =
        window.localStorage.getItem('accessToken');

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

  // --------------------------------------------------
  // LOCATION HIERARCHY
  // --------------------------------------------------

  function toggleExpanded(locationId: string) {
    setExpanded((current) => ({
      ...current,
      [locationId]: !current[locationId],
    }));
  }

  function getChildren(locationId: string) {
    return filteredLocations.filter(
      (location) => location.parentId === locationId,
    );
  }

  function renderLocation(
    location: Location,
    level = 0,
  ): ReactNode {
    const children = getChildren(location.id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded[location.id] ?? true;
    const isActive = location.status === 'active';
    const isToggling = togglingStatus === location.id;

    return (
      <div
        key={location.id}
        className="border-b border-[var(--border)] last:border-b-0"
      >
        <div
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-soft)]"
          style={{
            paddingLeft: `${16 + level * 26}px`,
          }}
        >
          <button
            type="button"
            onClick={() =>
              hasChildren && toggleExpanded(location.id)
            }
            className={`flex h-5 w-5 shrink-0 items-center justify-center ${
              hasChildren
                ? 'text-[var(--navy)]'
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
                  isExpanded ? '' : '-rotate-90'
                }
              />
            )}
          </button>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--navy)]">
            <MapPin size={14} strokeWidth={1.6} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-sans text-[13px] font-medium text-[var(--text)]">
                {location.name}
              </span>

              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 font-mono text-[9px] tracking-[0.06em] text-[var(--text-muted)]">
                {location.locationType.toUpperCase()}
              </span>

              {location.parentId && (
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 font-mono text-[9px] tracking-[0.06em] text-[var(--text-muted)]">
                  SUB-LOCATION
                </span>
              )}

              <span
                className={`rounded-full border px-1.5 py-0.5 font-mono text-[9px] tracking-widest ${
                  isActive
                    ? 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]'
                    : 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]'
                }`}
              >
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            <div className="mt-0.5 font-mono text-[9px] text-[var(--text-muted)]">
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
              onClick={() => toggleLocationStatus(location)}
              disabled={isToggling}
              className={`min-h-[36px] rounded-[8px] border px-2.5 py-1.5 font-sans text-[10px] font-semibold tracking-[0.04em] transition-colors disabled:cursor-wait disabled:opacity-50 ${
                isActive
                  ? 'border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-soft)]'
                  : 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)] hover:bg-[var(--success)] hover:text-white'
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
              onClick={() => openEditForm(location)}
              className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition-colors hover:border-[var(--navy)] hover:bg-[var(--surface-soft)] hover:text-[var(--navy)]"
              title="Edit location"
              aria-label={`Edit ${location.name}`}
            >
              <Edit3 size={14} strokeWidth={1.6} />
            </button>

            <button
              type="button"
              onClick={() => deleteLocation(location)}
              className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)]"
              title="Delete location"
              aria-label={`Delete ${location.name}`}
            >
              <Trash2 size={14} strokeWidth={1.6} />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {children.map((child) =>
              renderLocation(child, level + 1),
            )}
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <InventorySidebar
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed((current) => !current)
        }
      />

      <div
        className={`min-h-screen transition-[padding] duration-200 ${
          collapsed
            ? 'md:pl-[68px]'
            : 'md:pl-[205px]'
        }`}
      >
        <div className="px-4 py-5 md:px-7 md:py-7">
          <div className="mx-auto max-w-[1500px]">

            {/* PAGE HEADER */}

            <header className="mb-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="stockpile-status-dot"
                      aria-hidden="true"
                    />

                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
                      Organization locations
                    </span>
                  </div>

                  <h1 className="font-sans text-[38px] font-semibold leading-none tracking-[-0.045em] md:text-[46px]">
                    Locations
                  </h1>

                  <p className="mt-3 max-w-[680px] text-[13px] leading-6 text-[var(--text-muted)]">
                    Manage the physical locations where your
                    organization stores or manages inventory.
                  </p>
                </div>

                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border border-[var(--navy)] bg-[var(--navy)] px-4 py-2.5 font-sans text-[11px] font-semibold tracking-[0.04em] text-white transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)]"
                  >
                    <Plus size={14} strokeWidth={1.7} />
                    ADD LOCATION
                  </button>

                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-soft)]">
                    {industryLabel} · LOCATION REGISTER
                  </span>
                </div>
              </div>
            </header>

            {/* LOCATION SNAPSHOT */}

            <section className="mb-8">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    Location snapshot
                  </div>

                  <h2 className="mt-1 font-sans text-[19px] font-semibold tracking-[-0.02em]">
                    Organization overview
                  </h2>
                </div>

                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-soft)]">
                  Live database
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {/* Organization card */}

                <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_3px_12px_rgba(23,23,23,0.03)]">
                  <div className="flex items-center gap-2 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    <Building2
                      size={13}
                      strokeWidth={1.6}
                    />
                    Current organization
                  </div>

                  <div className="mt-3 font-sans text-[18px] font-semibold tracking-[-0.02em] text-[var(--text)]">
                    {loading
                      ? 'Loading...'
                      : organization?.name ?? '—'}
                  </div>
                </div>

                {/* Total locations card */}

                <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_3px_12px_rgba(23,23,23,0.03)]">
                  <div className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Total locations
                  </div>

                  <div className="mt-3 font-sans text-[32px] font-semibold leading-none tracking-[-0.035em] text-[var(--navy)]">
                    {locations.length}
                  </div>

                  <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-soft)]">
                    {activeCount} active · {inactiveCount} inactive
                  </div>
                </div>

                {/* Structure card */}

                <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_3px_12px_rgba(23,23,23,0.03)]">
                  <div className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Structure
                  </div>

                  <div className="mt-3 font-sans text-[18px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text)]">
                    {topLevelCount} top level · {childCount} child
                  </div>

                  <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-soft)]">
                    Hierarchical locations
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-5 rounded-[12px] border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3">
                  <div className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--danger)]">
                    Location error
                  </div>

                  <div className="mt-1.5 text-[12px] leading-5 text-[var(--danger)]">
                    {error}
                  </div>
                </div>
              )}
            </section>

            {/* LOCATION REGISTER */}

            <section className="mb-8 overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_6px_18px_rgba(23,23,23,0.045)]">
              <div className="px-5 py-5 md:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                      Location register
                    </div>

                    <h2 className="mt-1 font-sans text-[23px] font-semibold tracking-[-0.025em] text-[var(--text)]">
                      Location hierarchy
                    </h2>

                    <p className="mt-1.5 max-w-[650px] text-[12px] leading-5 text-[var(--text-muted)]">
                      Browse your stores, warehouses, departments
                      and other inventory locations.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Search
                      size={15}
                      strokeWidth={1.7}
                      className="shrink-0 text-[var(--text-muted)]"
                    />

                    <input
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                      placeholder="Search locations..."
                      aria-label="Search locations"
                      className="min-h-[44px] w-full rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 font-sans text-[12px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-soft)] focus:border-[var(--accent)] focus:bg-[var(--surface)] sm:w-[260px]"
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Register results
                  </div>

                  <div className="font-sans text-[12px] font-medium text-[var(--text)]">
                    {filteredLocations.length}{' '}
                    {filteredLocations.length === 1
                      ? 'record'
                      : 'records'}
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border)]">
                {loading || loadingLocations ? (
                  <div className="px-4 py-12 text-center text-[12px] text-[var(--text-muted)]">
                    Loading location register...
                  </div>
                ) : rootLocations.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <MapPin
                      size={30}
                      strokeWidth={1.4}
                      className="mx-auto text-[var(--text-soft)]"
                    />

                    <div className="mt-3 font-sans text-[13px] font-medium text-[var(--text)]">
                      {search
                        ? 'No matching locations found.'
                        : 'No locations created yet.'}
                    </div>

                    {!search && (
                      <>
                        <div className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">
                          Create your first store, warehouse,
                          pharmacy or department.
                        </div>

                        <button
                          type="button"
                          onClick={openCreateForm}
                          className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[9px] border border-[var(--navy)] bg-[var(--navy)] px-4 py-2.5 font-sans text-[11px] font-semibold tracking-[0.04em] text-white transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)]"
                        >
                          <Plus size={14} />
                          CREATE FIRST LOCATION
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  rootLocations.map((location) =>
                    renderLocation(location),
                  )
                )}
              </div>
            </section>

            {/* LOCATION INFORMATION */}

            <section className="mb-8">
              <div className="mb-4">
                <div className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Reference
                </div>

                <h2 className="mt-1 font-sans text-[19px] font-semibold tracking-[-0.02em]">
                  Managing locations
                </h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
                  <div className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Location hierarchy
                  </div>

                  <p className="mt-3 text-[12px] leading-6 text-[var(--text-muted)]">
                    A parent location can contain smaller stock
                    locations. Use this structure to mirror the
                    physical organization of your stores and
                    departments.
                  </p>
                </div>

                <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
                  <div className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Location status
                  </div>

                  <p className="mt-3 text-[12px] leading-6 text-[var(--text-muted)]">
                    Inactive locations remain visible and preserve
                    their existing inventory assignments. New stock
                    operations are blocked until the location is
                    activated.
                  </p>
                </div>
              </div>
            </section>

            {/* FOOTER */}

            <footer className="mt-7 border-t border-[var(--border)] pt-4">
              <div className="flex flex-col gap-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--text-soft)] sm:flex-row sm:items-center sm:justify-between">
                <span>Stockpile · Locations</span>

                <span>
                  {organization?.name ?? 'Organization'}
                </span>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT LOCATION MODAL */}

      {showForm && (
        <>
          <button
            type="button"
            aria-label="Close location form"
            onClick={closeForm}
            className="fixed inset-0 z-[60] bg-[var(--text)]/45 backdrop-blur-[2px]"
          />

          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
            <form
              onSubmit={handleSubmit}
              className="my-auto w-full max-w-[500px] rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_20px_50px_rgba(23,23,23,0.16)]"
            >
              <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <div className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                    Location register
                  </div>

                  <h3 className="mt-1 font-sans text-[22px] font-semibold tracking-[-0.025em] text-[var(--text)]">
                    {editingLocation
                      ? 'Edit location'
                      : 'Add location'}
                  </h3>

                  <p className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">
                    Define where inventory is physically stored
                    or managed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text)]"
                >
                  <X size={18} strokeWidth={1.7} />
                </button>
              </div>

              {formError && (
                <div className="mt-4 rounded-[10px] border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3 py-2.5 text-[12px] leading-5 text-[var(--danger)]">
                  {formError}
                </div>
              )}

              <div className="mt-5">
                <label
                  htmlFor="location-name"
                  className="mb-2 block font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]"
                >
                  Location name
                </label>

                <input
                  id="location-name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  maxLength={100}
                  placeholder="e.g. Central Medical Store"
                  className="min-h-[44px] w-full rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 font-sans text-[12px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-soft)] focus:border-[var(--accent)] focus:bg-[var(--surface)]"
                  autoFocus
                  required
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor="location-type"
                  className="mb-2 block font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]"
                >
                  Location type
                </label>

                <select
                  id="location-type"
                  value={locationType}
                  onChange={(event) =>
                    setLocationType(event.target.value)
                  }
                  className="min-h-[44px] w-full rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 font-sans text-[12px] text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)] focus:bg-[var(--surface)]"
                  required
                >
                  <option value="">Select type</option>

                  {LOCATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="parent-location"
                  className="mb-2 block font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]"
                >
                  Parent location
                </label>

                <select
                  id="parent-location"
                  value={parentId}
                  onChange={(event) =>
                    setParentId(event.target.value)
                  }
                  className="min-h-[44px] w-full rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 font-sans text-[12px] text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)] focus:bg-[var(--surface)]"
                >
                  <option value="">None · top level</option>

                  {locations
                    .filter(
                      (location) =>
                        location.id !== editingLocation?.id,
                    )
                    .map((location) => (
                      <option
                        key={location.id}
                        value={location.id}
                      >
                        {location.name}
                      </option>
                    ))}
                </select>

                <div className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">
                  Choose a parent when this location sits inside
                  another location.
                </div>
              </div>

              <div className="mt-6 flex gap-2 border-t border-[var(--border)] pt-5">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="min-h-[44px] flex-1 rounded-[9px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-sans text-[11px] font-semibold tracking-[0.04em] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] flex-1 rounded-[9px] border border-[var(--navy)] bg-[var(--navy)] px-4 py-2.5 font-sans text-[11px] font-semibold tracking-[0.04em] text-white transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] disabled:cursor-wait disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editingLocation
                      ? 'Update location'
                      : 'Create location'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </main>
  );
}