'use client';

import {
  ArrowRight,
  Lock,
  Mail,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || 'Unable to sign in',
        );
      }

      if (!data?.accessToken) {
        throw new Error(
          'Login succeeded but no access token was returned.',
        );
      }

      window.localStorage.setItem(
        'accessToken',
        data.accessToken,
      );

      router.push('/');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to sign in',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#ddd0b8] px-4 py-8 text-[#2b2620]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1100px] items-center justify-center">
        <section className="grid w-full max-w-[900px] overflow-hidden border border-[#b7a87e] bg-[#f5f0e3] shadow-[0_2px_0_#b7a87e,0_10px_24px_rgba(43,38,32,0.15)] md:grid-cols-[1.05fr_0.95fr]">
          
          {/* BRAND PANEL */}
          <div className="relative hidden border-r border-[#b7a87e] bg-[#2e4057] p-8 text-[#f5f0e3] md:block">
            <div className="pointer-events-none absolute inset-3 border border-dashed border-[#f5f0e3]/20" />

            <div className="relative flex h-full min-h-[500px] flex-col">
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
                  One schema, every floor — items,
                  locations, stock & transactions.
                </div>

                <div className="mt-8 flex gap-2">
                  <div className="border-2 border-[#c68a2e] px-3 py-2 font-mono text-[8px] font-normal tracking-widest text-[#c68a2e]">
                    STOCK
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
                LEDGER ACCESS TERMINAL
              </div>
            </div>
          </div>

          {/* LOGIN PANEL */}
          <div className="relative p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-3 border border-dashed border-[#2b2620]/15" />

            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[8px] font-normal tracking-widest text-[#a63a2e]">
                    SECURE ACCESS
                  </div>

                  <h1 className="mt-1 font-mono text-[22px] font-normal">
                    Sign in
                  </h1>

                  <p className="mt-1 font-mono text-[8px] font-normal text-[#5b5346]">
                    Access your inventory ledger.
                  </p>
                </div>

                <div className="rotate-[-2deg] border-2 border-[#a63a2e] px-2 py-1 font-mono text-[7px] font-normal tracking-widest text-[#a63a2e]">
                  AUTH
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-8"
              >
                {/* EMAIL */}
                <div className="mb-5">
                  <label className="mb-2 flex items-center gap-2 font-mono text-[8px] font-normal tracking-widest text-[#5b5346]">
                    <Mail size={13} strokeWidth={1.7} />
                    EMAIL
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    autoComplete="email"
                    required
                    placeholder="admin@example.com"
                    className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[11px] font-normal outline-none placeholder:text-[#5b5346]/60 focus:border-[#2e4057]"
                  />
                </div>

                {/* PASSWORD */}
                <div className="mb-5">
                  <label className="mb-2 flex items-center gap-2 font-mono text-[8px] font-normal tracking-widest text-[#5b5346]">
                    <Lock size={13} strokeWidth={1.7} />
                    PASSWORD
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete="current-password"
                    required
                    placeholder="Enter password"
                    className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[11px] font-normal outline-none placeholder:text-[#5b5346]/60 focus:border-[#2e4057]"
                  />
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
                  {loading ? 'SIGNING IN...' : 'SIGN IN'}

                  {!loading && (
                    <ArrowRight
                      size={15}
                      strokeWidth={1.7}
                    />
                  )}
                </button>
              </form>

              <div className="mt-8 border-t border-dashed border-[#b7a87e] pt-4">
                <div className="font-mono text-[7px] font-normal leading-4 text-[#5b5346]">
                  Your session is authenticated against
                  the organization membership and
                  permission system.
                </div>
              </div>

              <div className="mt-8 text-center font-mono text-[7px] font-normal tracking-wide text-[#5b5346]/60">
                INVENTORY LEDGER · AUTHORIZED ACCESS ONLY
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}