'use client';

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Edit3,
  Plus,
  Trash2,
  Truck,
  X,
} from 'lucide-react';

import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import { apiFetch } from '../../../lib/api';

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
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

export default function SetupSuppliersPage() {
  const router = useRouter();

  const [organization, setOrganization] =
    useState<
      CurrentUserResponse['organization'] | null
    >(null);

  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingSuppliers, setLoadingSuppliers] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [formError, setFormError] =
    useState('');

  const [showForm, setShowForm] =
    useState(false);

  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);

  const [name, setName] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [address, setAddress] =
    useState('');

  async function loadSuppliers() {
    try {
      setLoadingSuppliers(true);
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
          Supplier[] | { data: Supplier[] }
        >('/suppliers', token);

      const data = Array.isArray(response)
        ? response
        : response.data ?? [];

      setSuppliers(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to load suppliers.',
      );
    } finally {
      setLoadingSuppliers(false);
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

        await loadSuppliers();
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

  function resetForm() {
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setFormError('');
    setEditingSupplier(null);
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(
    supplier: Supplier,
  ) {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setPhone(supplier.phone ?? '');
    setEmail(supplier.email ?? '');
    setAddress(supplier.address ?? '');
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

    const trimmedPhone =
      phone.trim();

    const trimmedEmail =
      email.trim();

    const trimmedAddress =
      address.trim();

    if (!trimmedName) {
      setFormError(
        'Enter a supplier name.',
      );
      return;
    }

    if (
      trimmedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        trimmedEmail,
      )
    ) {
      setFormError(
        'Enter a valid email address.',
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
        ...(trimmedPhone
          ? { phone: trimmedPhone }
          : {}),
        ...(trimmedEmail
          ? { email: trimmedEmail }
          : {}),
        ...(trimmedAddress
          ? { address: trimmedAddress }
          : {}),
      };

      if (editingSupplier) {
        await apiFetch(
          `/suppliers/${editingSupplier.id}`,
          token,
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          },
        );
      } else {
        await apiFetch(
          '/suppliers',
          token,
          {
            method: 'POST',
            body: JSON.stringify(body),
          },
        );
      }

      await loadSuppliers();

      setShowForm(false);
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to save supplier.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSupplier(
    supplier: Supplier,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${supplier.name}"? This may fail if the supplier is already being used.`,
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
        `/suppliers/${supplier.id}`,
        token,
        {
          method: 'DELETE',
        },
      );

      await loadSuppliers();
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to delete supplier.',
      );
    }
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
              SUPPLIER SETUP
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
                  SETUP · 02 / 05
                </div>

                <h1 className="mt-1 font-mono text-[28px] leading-tight">
                  Suppliers
                </h1>

                {organization ? (
                  <p className="mt-2 font-mono text-[9px] text-[#5b5346]">
                    Register the suppliers that support{' '}
                    <span className="text-[#2b2620]">
                      {organization.name}
                    </span>
                    .
                  </p>
                ) : (
                  <p className="mt-2 font-mono text-[9px] text-[#5b5346]">
                    Create the suppliers your
                    organization works with.
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
                ADD SUPPLIER
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

            {/* SUPPLIER LIST */}
            <div className="mt-6">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="font-mono text-[8px] text-[#5b5346]">
                    {suppliers.length}{' '}
                    TOTAL SUPPLIERS
                  </div>

                  <h2 className="mt-1 font-mono text-[18px]">
                    SUPPLIER REGISTER
                  </h2>
                </div>

                {suppliers.length > 0 && (
                  <div className="flex items-center gap-2 font-mono text-[7px] text-[#3d6b4f]">
                    <Check
                      size={13}
                      strokeWidth={1.7}
                    />
                    SUPPLIER RECORDS CREATED
                  </div>
                )}
              </div>

              <div className="overflow-hidden border border-[#b7a87e]">
                {loading ||
                loadingSuppliers ? (
                  <div className="px-4 py-10 text-center font-mono text-[8px] text-[#5b5346]">
                    LOADING SUPPLIERS...
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <Truck
                      size={28}
                      strokeWidth={1.4}
                      className="mx-auto text-[#b7a87e]"
                    />

                    <div className="mt-3 font-mono text-[10px]">
                      No suppliers registered yet.
                    </div>

                    <div className="mt-1 font-mono text-[8px] text-[#5b5346]">
                      Start by adding a supplier
                      that provides stock to your
                      organization.
                    </div>

                    <button
                      type="button"
                      onClick={openCreateForm}
                      className="mt-4 border border-[#2b2620] px-4 py-2 font-mono text-[8px] tracking-widest hover:bg-[#2e4057] hover:text-[#f5f0e3]"
                    >
                      CREATE FIRST SUPPLIER
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse">
                      <thead>
                        <tr className="border-b border-[#b7a87e] bg-[#eae2ce]">
                          <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest text-[#5b5346]">
                            SUPPLIER
                          </th>

                          <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest text-[#5b5346]">
                            PHONE
                          </th>

                          <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest text-[#5b5346]">
                            EMAIL
                          </th>

                          <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest text-[#5b5346]">
                            ADDRESS
                          </th>

                          <th className="px-4 py-3 text-right font-mono text-[7px] tracking-widest text-[#5b5346]">
                            ACTIONS
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {suppliers.map(
                          (supplier) => (
                            <tr
                              key={supplier.id}
                              className="border-b border-dashed border-[#b7a87e] last:border-b-0 hover:bg-[#eae2ce]"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#2e4057] text-[#2e4057]">
                                    <Truck
                                      size={14}
                                      strokeWidth={1.6}
                                    />
                                  </div>

                                  <div className="min-w-0">
                                    <div className="font-mono text-[9px]">
                                      {supplier.name}
                                    </div>

                                    <div className="mt-0.5 font-mono text-[7px] text-[#5b5346]">
                                      {supplier.status
                                        ? supplier.status.toUpperCase()
                                        : 'ACTIVE'}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3 font-mono text-[8px] text-[#5b5346]">
                                {supplier.phone || '—'}
                              </td>

                              <td className="px-4 py-3 font-mono text-[8px] text-[#5b5346]">
                                {supplier.email || '—'}
                              </td>

                              <td className="max-w-[270px] px-4 py-3 font-mono text-[8px] leading-5 text-[#5b5346]">
                                {supplier.address || '—'}
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditForm(
                                        supplier,
                                      )
                                    }
                                    className="border border-[#b7a87e] p-1.5 text-[#5b5346] hover:border-[#2e4057] hover:text-[#2e4057]"
                                    title="Edit supplier"
                                  >
                                    <Edit3
                                      size={12}
                                      strokeWidth={1.6}
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteSupplier(
                                        supplier,
                                      )
                                    }
                                    className="border border-[#b7a87e] p-1.5 text-[#a63a2e] hover:border-[#a63a2e]"
                                    title="Delete supplier"
                                  >
                                    <Trash2
                                      size={12}
                                      strokeWidth={1.6}
                                    />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* HELP */}
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="border border-dashed border-[#b7a87e] p-4">
                <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                  EXAMPLE HOSPITAL SUPPLIERS
                </div>

                <div className="mt-3 font-mono text-[8px] leading-5 text-[#5b5346]">
                  Emzor Pharmaceutical Industries
                  <br />
                  Meyers Pharmaceuticals
                  <br />
                  MedSupply Nigeria Ltd
                  <br />
                  Laboratory Consumables Ltd
                  <br />
                  Medical Equipment Supplier
                </div>
              </div>

              <div className="border border-dashed border-[#b7a87e] p-4">
                <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                  HOW IT WORKS
                </div>

                <div className="mt-3 font-mono text-[8px] leading-5 text-[#5b5346]">
                  Suppliers are organization-specific.
                  Add the companies that actually
                  provide stock to your organization.
                  Supplier records can later be linked
                  to inventory items.
                </div>
              </div>
            </div>

            {/* NAVIGATION */}
            <div className="mt-6 flex flex-col gap-2 border-t border-dashed border-[#b7a87e] pt-5 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/setup/locations',
                  )
                }
                className="flex items-center justify-center gap-2 border border-[#2b2620] px-4 py-2.5 font-mono text-[8px] tracking-widest hover:bg-[#eae2ce]"
              >
                <ArrowLeft
                  size={14}
                  strokeWidth={1.7}
                />
                PREVIOUS · LOCATIONS
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/setup/categories',
                  )
                }
                className="flex items-center justify-center gap-2 border-2 border-[#2e4057] bg-[#2e4057] px-4 py-2.5 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620]"
              >
                NEXT · CATEGORIES
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
              INVENTORY LEDGER · SUPPLIER
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
            aria-label="Close supplier form"
            onClick={closeForm}
            className="fixed inset-0 z-[60] bg-[#2b2620]/45"
          />

          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
            <form
              onSubmit={handleSubmit}
              className="my-auto w-full max-w-[520px] border border-[#2b2620] bg-[#f5f0e3] p-5 shadow-[8px_10px_0_rgba(43,38,32,0.18)]"
            >
              <div className="flex items-start justify-between border-b border-dashed border-[#b7a87e] pb-4">
                <div>
                  <div className="font-mono text-[7px] tracking-widest text-[#a63a2e]">
                    SUPPLIER REGISTER
                  </div>

                  <h3 className="mt-1 font-mono text-[20px]">
                    {editingSupplier
                      ? 'EDIT SUPPLIER'
                      : 'ADD SUPPLIER'}
                  </h3>

                  <p className="mt-1 font-mono text-[7px] text-[#5b5346]">
                    Record the company or person
                    supplying inventory to your
                    organization.
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
                  SUPPLIER NAME
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                  maxLength={150}
                  placeholder="e.g. MedSupply Nigeria Ltd"
                  className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[11px] outline-none"
                  autoFocus
                  required
                />
              </div>

              {/* PHONE */}
              <div className="mt-5">
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                  PHONE
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value,
                    )
                  }
                  maxLength={30}
                  placeholder="e.g. 08012345678"
                  className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[11px] outline-none"
                />
              </div>

              {/* EMAIL */}
              <div className="mt-5">
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                  EMAIL
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  maxLength={150}
                  placeholder="supplier@example.com"
                  className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[11px] outline-none"
                />
              </div>

              {/* ADDRESS */}
              <div className="mt-5">
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                  ADDRESS
                </label>

                <textarea
                  value={address}
                  onChange={(event) =>
                    setAddress(
                      event.target.value,
                    )
                  }
                  maxLength={500}
                  rows={3}
                  placeholder="Supplier business address"
                  className="w-full resize-none border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[10px] leading-5 outline-none"
                />
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
                    : editingSupplier
                      ? 'UPDATE SUPPLIER'
                      : 'CREATE SUPPLIER'}
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
