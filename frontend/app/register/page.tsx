'use client';

import {
  ArrowRight,
  Building2,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');
  const [organizationName, setOrganizationName] =
    useState('');
  const [industryType, setIndustryType] =
    useState('');

  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState('');

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            password,
            organizationName,
            industryType,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        const message =
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message;

        throw new Error(
          message ||
            'Unable to create your account.',
        );
      }

      if (!data?.accessToken) {
        throw new Error(
          'Registration succeeded but no access token was returned.',
        );
      }

      window.localStorage.setItem(
        'accessToken',
        data.accessToken,
      );

      router.push('/setup');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create your account.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#ddd0b8] px-4 py-8 text-[#2b2620]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1100px] items-center justify-center">
        <section className="grid w-full max-w-[950px] overflow-hidden border border-[#b7a87e] bg-[#f5f0e3] shadow-[0_2px_0_#b7a87e,0_10px_24px_rgba(43,38,32,0.15)] md:grid-cols-[1.05fr_0.95fr]">

          {/* BRAND PANEL */}
          <div className="relative hidden border-r border-[#b7a87e] bg-[#2e4057] p-8 text-[#f5f0e3] md:block">
            <div className="pointer-events-none absolute inset-3 border border-dashed border-[#f5f0e3]/20" />

            <div className="relative flex h-full min-h-[570px] flex-col">
              <div className="font-mono text-[8px] font-normal tracking-[0.18em] text-[#ddd0b8]">
                INVENTORY MANAGEMENT SYSTEM
              </div>

              <div className="mt-auto">
                <div className="font-mono text-[30px] font-normal tracking-[0.03em]">
                  INVENTORY
                </div>

                <div className="font-mono text-[30px] font-normal tracking-[0.03em]">
                  LEDGER
                </div>

                <div className="mt-3 max-w-sm font-mono text-[10px] font-normal leading-5 text-[#ddd0b8]">
                  Build your organization's
                  inventory system around the
                  way your business actually
                  operates.
                </div>

                <div className="mt-8 flex gap-2">
                  <div className="border-2 border-[#c68a2e] px-3 py-2 font-mono text-[8px] font-normal tracking-widest text-[#c68a2e]">
                    BUILD
                  </div>

                  <div className="border-2 border-[#f5f0e3]/50 px-3 py-2 font-mono text-[8px] font-normal tracking-widest">
                    CONTROL
                  </div>

                  <div className="border-2 border-[#a63a2e] px-3 py-2 font-mono text-[8px] font-normal tracking-widest text-[#e28b80]">
                    AUDIT
                  </div>
                </div>
              </div>

              <div className="mt-10 font-mono text-[7px] font-normal tracking-widest text-[#ddd0b8]/60">
                ORGANIZATION SETUP TERMINAL
              </div>
            </div>
          </div>

          {/* REGISTER PANEL */}
          <div className="relative p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-3 border border-dashed border-[#2b2620]/15" />

            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[8px] font-normal tracking-widest text-[#a63a2e]">
                    NEW ORGANIZATION
                  </div>

                  <h1 className="mt-1 font-mono text-[22px] font-normal">
                    Create account
                  </h1>

                  <p className="mt-1 font-mono text-[8px] font-normal text-[#5b5346]">
                    Create your organization
                    and start building its
                    inventory ledger.
                  </p>
                </div>

                <div className="rotate-[-2deg] border-2 border-[#a63a2e] px-2 py-1 font-mono text-[7px] font-normal tracking-widest text-[#a63a2e]">
                  REGISTER
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-7"
              >
                {/* NAME */}
                <div className="mb-4">
                  <label className="mb-2 flex items-center gap-2 font-mono text-[8px] font-normal tracking-widest text-[#5b5346]">
                    <User
                      size={13}
                      strokeWidth={1.7}
                    />
                    YOUR NAME
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value,
                      )
                    }
                    autoComplete="name"
                    required
                    placeholder="Jane Doe"
                    className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[11px] font-normal outline-none placeholder:text-[#5b5346]/60 focus:border-[#2e4057]"
                  />
                </div>

                {/* EMAIL */}
                <div className="mb-4">
                  <label className="mb-2 flex items-center gap-2 font-mono text-[8px] font-normal tracking-widest text-[#5b5346]">
                    <Mail
                      size={13}
                      strokeWidth={1.7}
                    />
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
                    autoComplete="email"
                    required
                    placeholder="admin@hospital.com"
                    className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[11px] font-normal outline-none placeholder:text-[#5b5346]/60 focus:border-[#2e4057]"
                  />
                </div>

                {/* PASSWORD */}
                <div className="mb-4">
                  <label className="mb-2 flex items-center gap-2 font-mono text-[8px] font-normal tracking-widest text-[#5b5346]">
                    <Lock
                      size={13}
                      strokeWidth={1.7}
                    />
                    PASSWORD
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[11px] font-normal outline-none placeholder:text-[#5b5346]/60 focus:border-[#2e4057]"
                  />
                </div>

                {/* ORGANIZATION */}
                <div className="mb-4">
                  <label className="mb-2 flex items-center gap-2 font-mono text-[8px] font-normal tracking-widest text-[#5b5346]">
                    <Building2
                      size={13}
                      strokeWidth={1.7}
                    />
                    ORGANIZATION NAME
                  </label>

                  <input
                    type="text"
                    value={organizationName}
                    onChange={(event) =>
                      setOrganizationName(
                        event.target.value,
                      )
                    }
                    required
                    placeholder="St. Mary's Specialist Hospital"
                    className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[11px] font-normal outline-none placeholder:text-[#5b5346]/60 focus:border-[#2e4057]"
                  />
                </div>

                {/* INDUSTRY */}
                <div className="mb-5">
                  <label className="mb-2 flex items-center gap-2 font-mono text-[8px] font-normal tracking-widest text-[#5b5346]">
                    <Building2
                      size={13}
                      strokeWidth={1.7}
                    />
                    INDUSTRY
                  </label>

                  <select
                    value={industryType}
                    onChange={(event) =>
                      setIndustryType(
                        event.target.value,
                      )
                    }
                    required
                    className="w-full border-0 border-b border-[#2b2620] bg-[#f5f0e3] px-1 py-2 font-mono text-[10px] font-normal outline-none focus:border-[#2e4057]"
                  >
                    <option value="">
                      SELECT INDUSTRY
                    </option>

                    <option value="hospital">
                      HOSPITAL
                    </option>

                    <option value="supermarket">
                      SUPERMARKET
                    </option>

                    <option value="hotel">
                      HOTEL
                    </option>

                    <option value="marketing">
                      MARKETING
                    </option>

                    <option value="general">
                      GENERAL
                    </option>
                  </select>
                </div>

                {/* ERROR */}
                {error && (
                  <div className="mb-5 border border-[#a63a2e] bg-[#a63a2e]/5 px-3 py-2.5">
                    <div className="font-mono text-[8px] font-normal tracking-wide text-[#a63a2e]">
                      {error}
                    </div>
                  </div>
                )}

                {/* SUBMIT */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 border-2 border-[#2e4057] bg-[#2e4057] px-4 py-3 font-mono text-[9px] font-normal tracking-widest text-[#f5f0e3] transition hover:bg-[#c68a2e] hover:text-[#2b2620] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? 'CREATING ACCOUNT...'
                    : 'CREATE ORGANIZATION'}

                  {!loading && (
                    <ArrowRight
                      size={15}
                      strokeWidth={1.7}
                    />
                  )}
                </button>
              </form>

              <div className="mt-7 border-t border-dashed border-[#b7a87e] pt-4">
                <div className="font-mono text-[7px] font-normal leading-4 text-[#5b5346]">
                  You will become the Owner of
                  this organization. You can
                  configure locations, suppliers,
                  categories and inventory after
                  registration.
                </div>
              </div>

              <div className="mt-7 text-center font-mono text-[7px] font-normal tracking-wide text-[#5b5346]/60">
                ALREADY HAVE AN ACCOUNT?{' '}
                <a
                  href="/login"
                  className="text-[#2e4057] underline"
                >
                  SIGN IN
                </a>
              </div>

              <div className="mt-5 text-center font-mono text-[7px] font-normal tracking-wide text-[#5b5346]/60">
                INVENTORY LEDGER · ORGANIZATION
                REGISTRATION
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}