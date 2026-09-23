'use client';

import {
  useEffect,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

type AuthGuardProps = {
  children: React.ReactNode;
};

export default function AuthGuard({
  children,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] =
    useState(true);

  const [authenticated, setAuthenticated] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        if (pathname !== '/login') {
          router.replace('/login');
        }

        if (!cancelled) {
          setAuthenticated(false);
          setChecking(false);
        }

        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          },
        );

        if (response.ok) {
          if (pathname === '/login') {
            router.replace('/');
          }

          if (!cancelled) {
            setAuthenticated(true);
          }

                    return;
                  }

                  if (response.status === 401) {
            localStorage.removeItem(
              'accessToken',
            );

            router.replace('/login');
            return;
          }

        // Backend/server error.
        // Keep the token and allow the page to render.
        if (!cancelled) {
          setAuthenticated(
            pathname !== '/login',
          );
        }
      } catch {
        // Network/backend unavailable.
        // Do not destroy an otherwise valid token.
        if (!cancelled) {
          setAuthenticated(
            pathname !== '/login',
          );
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    setChecking(true);
    verifySession();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (checking || !authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#ddd0b8] text-[#2b2620]">
        <div className="border border-[#b7a87e] bg-[#f5f0e3] px-6 py-5 shadow-[0_2px_0_#b7a87e]">
          <div className="font-mono text-[9px] tracking-widest text-[#5b5346]">
            AUTHENTICATING SESSION
          </div>

          <div className="mt-2 font-mono text-[11px]">
            VERIFYING ACCESS...
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}