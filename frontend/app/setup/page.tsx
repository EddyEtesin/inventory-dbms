'use client';

import {
  ArrowRight,
  Boxes,
  Building2,
  Check,
  Layers3,
  MapPin,
  Package,
  Truck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

type SetupStep = {
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
};

const setupSteps: SetupStep[] = [
  {
    number: '01',
    title: 'LOCATIONS',
    description:
      'Create your stores, pharmacies, departments, warehouses and other stock locations.',
    icon: MapPin,
    href: '/setup/locations',
  },
  {
    number: '02',
    title: 'SUPPLIERS',
    description:
      'Add the companies and contacts that supply your organization.',
    icon: Truck,
    href: '/setup/suppliers',
  },
  {
    number: '03',
    title: 'CATEGORIES',
    description:
      'Create the categories you use to organize your inventory.',
    icon: Layers3,
    href: '/setup/categories',
  },
  {
    number: '04',
    title: 'ITEMS',
    description:
      'Add the products, medicines, consumables or other stock you manage.',
    icon: Package,
    href: '/setup/items',
  },
  {
    number: '05',
    title: 'OPENING STOCK',
    description:
      'Enter the inventory already available at each assigned location.',
    icon: Boxes,
    href: '/setup/opening-balances',
  },
];

export default function SetupPage() {
  const router = useRouter();

  const [organization, setOrganization] =
    useState<CurrentUserResponse['organization'] | null>(
      null,
    );

  const [user, setUser] =
    useState<CurrentUserResponse['user'] | null>(
      null,
    );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadOrganization() {
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

        const response =
          await apiFetch<CurrentUserResponse>(
            '/auth/me',
            token,
          );

        setOrganization(
          response.organization,
        );

        setUser(response.user);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load your organization.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrganization();
  }, [router]);

  const industryLabel =
    organization?.industryType
      ? organization.industryType
          .replace(/_/g, ' ')
          .toUpperCase()
      : 'ORGANIZATION';

  return (
    <main className="min-h-screen bg-[#ddd0b8] px-4 py-6 text-[#2b2620]">
      <div className="mx-auto max-w-[1150px]">

        {/* TOP BAR */}
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
              ORGANIZATION SETUP
            </div>
          </div>
        </header>

        {/* MAIN PAPER */}
        <section className="relative mt-4 border border-[#b7a87e] bg-[#f5f0e3] p-5 shadow-[0_2px_0_#b7a87e,0_8px_20px_rgba(43,38,32,0.12)] md:p-7">
          <div className="pointer-events-none absolute inset-2 border border-dashed border-[#2b2620]/15" />

          <div className="relative">

            {/* INTRO */}
            <div className="flex flex-col gap-5 border-b border-dashed border-[#b7a87e] pb-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-[700px]">
                <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
                  FIRST RUN
                </div>

                <h1 className="mt-1 font-mono text-[28px] leading-tight">
                  Build your organization
                </h1>

                {loading ? (
                  <p className="mt-2 font-mono text-[9px] text-[#5b5346]">
                    Loading organization...
                  </p>
                ) : error ? (
                  <p className="mt-2 font-mono text-[9px] text-[#a63a2e]">
                    {error}
                  </p>
                ) : (
                  <p className="mt-2 font-mono text-[9px] leading-5 text-[#5b5346]">
                    {user?.name
                      ? `${user.name}, `
                      : ''}
                    your organization is ready.
                    Now configure the structure
                    that your team will use to
                    manage stock.
                  </p>
                )}
              </div>

              {!loading && organization && (
                <div className="min-w-[240px] border border-[#2e4057] bg-[#2e4057] px-4 py-3 text-[#f5f0e3]">
                  <div className="font-mono text-[7px] tracking-widest text-[#ddd0b8]">
                    ORGANIZATION
                  </div>

                  <div className="mt-1 font-mono text-[14px]">
                    {organization.name}
                  </div>

                  <div className="mt-2 font-mono text-[7px] tracking-widest text-[#c68a2e]">
                    {industryLabel}
                  </div>
                </div>
              )}
            </div>

            {/* STEPS */}
            <div className="mt-6">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="font-mono text-[8px] text-[#5b5346]">
                    SETUP CHECKLIST
                  </div>

                  <h2 className="mt-1 font-mono text-[18px]">
                    Build your inventory structure
                  </h2>
                </div>

                <div className="font-mono text-[7px] text-[#5b5346]">
                  0 / 5 COMPLETE
                </div>
              </div>

              <div className="border border-[#b7a87e]">
                {setupSteps.map(
                  (step, index) => {
                    const Icon = step.icon;

                    return (
                      <button
                        key={step.number}
                        type="button"
                        onClick={() =>
                          router.push(
                            step.href,
                          )
                        }
                        className={`group flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-[#eae2ce] ${
                          index <
                          setupSteps.length - 1
                            ? 'border-b border-dashed border-[#b7a87e]'
                            : ''
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#2e4057] font-mono text-[8px] text-[#2e4057]">
                          <Icon
                            size={15}
                            strokeWidth={1.6}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[7px] tracking-widest text-[#a63a2e]">
                              {step.number}
                            </span>

                            <span className="font-mono text-[11px]">
                              {step.title}
                            </span>
                          </div>

                          <p className="mt-1 max-w-[680px] font-mono text-[8px] leading-4 text-[#5b5346]">
                            {step.description}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 font-mono text-[7px] tracking-widest text-[#5b5346] group-hover:text-[#2e4057]">
                          START

                          <ArrowRight
                            size={14}
                            strokeWidth={1.7}
                          />
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* PRINCIPLE */}
            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_300px]">
              <div className="border border-[#b7a87e] p-4">
                <div className="flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#3d6b4f]">
                  <Check
                    size={14}
                    strokeWidth={1.7}
                  />
                  YOUR ORGANIZATION, YOUR STRUCTURE
                </div>

                <p className="mt-2 font-mono text-[8px] leading-5 text-[#5b5346]">
                  Inventory Ledger does not assume
                  how your organization stores
                  stock. You create the locations,
                  suppliers, categories and items
                  that match your actual operation.
                </p>
              </div>

              <div className="border border-[#2e4057] bg-[#2e4057] p-4 text-[#f5f0e3]">
                <div className="flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#c68a2e]">
                  <Building2
                    size={14}
                    strokeWidth={1.7}
                  />
                  INDUSTRY
                </div>

                <div className="mt-2 font-mono text-[15px]">
                  {industryLabel}
                </div>

                <div className="mt-2 font-mono text-[7px] leading-4 text-[#ddd0b8]">
                  Your industry helps us tailor
                  future features without limiting
                  how you configure your inventory.
                </div>
              </div>
            </div>

            {/* ONBOARDING ACTIONS */}
            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-dashed border-[#b7a87e] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  router.push('/')
                }
                className="border border-[#2b2620] px-4 py-2.5 font-mono text-[8px] tracking-widest hover:bg-[#eae2ce]"
              >
                SKIP SETUP
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/setup/locations',
                  )
                }
                className="flex items-center justify-center gap-2 border-2 border-[#2e4057] bg-[#2e4057] px-4 py-2.5 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620]"
              >
                CONTINUE SETUP

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
              INVENTORY LEDGER · ORGANIZATION SETUP
            </span>

            <span>
              LIVE DATABASE
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}