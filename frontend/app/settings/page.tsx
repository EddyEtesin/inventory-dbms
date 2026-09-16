'use client';

import { Building2, ClipboardList, ShieldCheck, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import InventorySidebar from '../../components/inventory/InventorySidebar';
import { apiFetch } from '../../lib/api';

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

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .toUpperCase();
}

export default function SettingsPage() {
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [data, setData] =
    useState<CurrentUserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        setLoading(true);
        setError('');

        const token =
          window.localStorage.getItem('accessToken');

        if (!token) {
          router.push('/login');
          return;
        }

        const response =
          await apiFetch<CurrentUserResponse>(
            '/auth/me',
            token,
          );

        setData(response);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load settings.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadCurrentUser();
  }, [router]);

  const organization = data?.organization;
  const user = data?.user;
  const role = data?.role;

  return (
    <main className="min-h-screen bg-[#ddd0b8] text-[#2b2620]">
      <InventorySidebar
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed((value) => !value)
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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-[8px] tracking-[0.18em] text-[#5b5346]">
                    INVENTORY MANAGEMENT SYSTEM
                  </div>

                  <div className="mt-1 font-mono text-[19px] tracking-[0.05em]">
                    SETTINGS
                  </div>
                </div>

                <div className="hidden border-2 border-[#a63a2e] px-2.5 py-1 font-mono text-[7px] tracking-widest text-[#a63a2e] sm:block">
                  ORGANIZATION CONFIGURATION
                </div>
              </div>
            </header>

            {/* MAIN PAPER */}
            <section className="relative mt-4 border border-[#b7a87e] bg-[#f5f0e3] p-5 shadow-[0_2px_0_#b7a87e,0_8px_20px_rgba(43,38,32,0.12)] md:p-7">
              <div className="pointer-events-none absolute inset-2 border border-dashed border-[#2b2620]/15" />

              <div className="relative">

                {/* INTRO */}
                <div className="border-b border-dashed border-[#b7a87e] pb-5">
                  <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
                    SYSTEM SETTINGS
                  </div>

                  <h1 className="mt-1 font-mono text-[28px] leading-tight">
                    Organization & Account
                  </h1>

                  <p className="mt-2 max-w-[760px] font-mono text-[9px] leading-5 text-[#5b5346]">
                    Review your organization,
                    account and access context.
                    Administrative controls will
                    become available as the supporting
                    backend functionality is introduced.
                  </p>
                </div>

                {/* ERROR */}
                {error && (
                  <div className="mt-5 border border-[#a63a2e] bg-[#f5f0e3] px-4 py-3 font-mono text-[8px] leading-4 text-[#a63a2e]">
                    {error}
                  </div>
                )}

                {/* ORGANIZATION */}
                <section className="mt-5">
                  <div className="mb-3 flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#5b5346]">
                    <Building2
                      size={14}
                      strokeWidth={1.6}
                    />
                    ORGANIZATION
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <InfoCard
                      label="NAME"
                      value={
                        loading
                          ? 'LOADING...'
                          : organization?.name ?? '—'
                      }
                    />

                    <InfoCard
                      label="INDUSTRY"
                      value={
                        loading
                          ? 'LOADING...'
                          : organization?.industryType
                            ? formatLabel(
                                organization.industryType,
                              )
                            : '—'
                      }
                    />

                    <InfoCard
                      label="STATUS"
                      value={
                        loading
                          ? 'LOADING...'
                          : organization?.status
                            ? formatLabel(
                                organization.status,
                              )
                            : '—'
                      }
                    />
                  </div>
                </section>

                {/* MY ACCOUNT */}
                <section className="mt-6">
                  <div className="mb-3 flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#5b5346]">
                    <User
                      size={14}
                      strokeWidth={1.6}
                    />
                    MY ACCOUNT
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <InfoCard
                      label="NAME"
                      value={
                        loading
                          ? 'LOADING...'
                          : user?.name ?? '—'
                      }
                    />

                    <InfoCard
                      label="EMAIL"
                      value={
                        loading
                          ? 'LOADING...'
                          : user?.email ?? '—'
                      }
                    />

                    <InfoCard
                      label="ROLE"
                      value={
                        loading
                          ? 'LOADING...'
                          : role?.name ?? '—'
                      }
                    />
                  </div>
                </section>

                {/* USERS & ACCESS */}
                <section className="mt-6">
                  <div className="mb-3 flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#5b5346]">
                    <ShieldCheck
                      size={14}
                      strokeWidth={1.6}
                    />
                    USERS & ACCESS
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <StatusCard
                      title="ROLE MANAGEMENT"
                      description="Role creation and role assignment controls will be connected when the supporting user-management backend is available."
                    />

                    <StatusCard
                      title="USER INVITATIONS"
                      description="Invitation workflows are not exposed yet because the supporting backend endpoint is not currently available."
                    />
                  </div>
                </section>

                {/* AUDIT LOG */}
                <section className="mt-6">
                  <div className="mb-3 flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#5b5346]">
                    <ClipboardList
                      size={14}
                      strokeWidth={1.6}
                    />
                    AUDIT LOG
                  </div>

                  <StatusCard
                    title="ACTIVITY LOGGING"
                    description="Audit-log viewing and filtering will be enabled once the audit backend module is implemented."
                  />
                </section>

                {/* NOTE */}
                <div className="mt-6 border border-dashed border-[#b7a87e] bg-[#eae2ce] px-4 py-3">
                  <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
                    CURRENT CAPABILITY
                  </div>

                  <p className="mt-1 font-mono text-[8px] leading-5 text-[#5b5346]">
                    This page currently exposes
                    supported identity and organization
                    information from the authentication
                    layer. Unsupported administrative
                    actions are intentionally inactive.
                  </p>
                </div>
              </div>
            </section>

            {/* FOOTER */}
            <footer className="mt-3 border-t border-dashed border-[#b7a87e] pt-2 font-mono text-[7px] text-[#5b5346]">
              <div className="flex justify-between gap-4">
                <span>
                  INVENTORY LEDGER · SETTINGS
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
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-[#b7a87e] bg-[#f5f0e3] p-4">
      <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
        {label}
      </div>

      <div className="mt-1 break-words font-mono text-[11px]">
        {value}
      </div>
    </div>
  );
}

function StatusCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border border-[#b7a87e] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[9px]">
          {title}
        </div>

        <span className="border border-[#c68a2e] px-2 py-1 font-mono text-[6px] tracking-widest text-[#9b681b]">
          NOT AVAILABLE
        </span>
      </div>

      <p className="mt-2 font-mono text-[8px] leading-5 text-[#5b5346]">
        {description}
      </p>
    </div>
  );
}