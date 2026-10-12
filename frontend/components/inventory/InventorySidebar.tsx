'use client';

import Link from 'next/link';
import {
  usePathname,
  useRouter,
} from 'next/navigation';

import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Settings,
  Truck,
} from 'lucide-react';

type InventorySidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const navItems = [
  {
    label: 'DASHBOARD',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'INVENTORY',
    href: '/inventory',
    icon: Boxes,
  },
  {
    label: 'LOCATIONS',
    href: '/locations',
    icon: MapPin,
  },
  {
    label: 'SUPPLIERS',
    href: '/suppliers',
    icon: Truck,
  },
  {
    label: 'CATEGORIES',
    href: '/categories',
    icon: Package,
  },
  {
    label: 'ITEMS',
    href: '/items',
    icon: Boxes,
  },
  {
    label: 'REPORTS',
    href: '/reports',
    icon: BarChart3,
  },
];

export default function InventorySidebar({
  collapsed,
  onToggle,
}: InventorySidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    window.localStorage.removeItem(
      'accessToken',
    );

    router.replace('/login');
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[2px_0_14px_rgba(23,23,23,0.03)] md:flex ${
        collapsed
          ? 'w-[68px]'
          : 'w-[205px]'
      }`}
    >
      {/* BRAND */}

      <div
        className={`flex min-h-[72px] items-center border-b border-[var(--border)] ${
          collapsed
            ? 'justify-center px-2'
            : 'px-4'
        }`}
      >
        {collapsed ? (
          <span className="font-mono text-[17px] font-medium tracking-[-0.04em] text-[var(--text)]">
            ST
          </span>
        ) : (
          <div>
            <div className="font-sans text-[17px] font-semibold tracking-[-0.025em] text-[var(--text)]">
              STOCKPILE
            </div>

            <div className="mt-1 font-mono text-[8px] tracking-[0.16em] text-[var(--text-muted)]">
              INVENTORY MANAGEMENT
            </div>
          </div>
        )}
      </div>

      {/* NAVIGATION */}

      <nav className="flex-1 px-2.5 py-4">
        {!collapsed && (
          <div className="mb-3 px-2 font-mono text-[8px] tracking-[0.2em] text-[var(--text-soft)]">
            WORKSPACE
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;

          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname ===
                  item.href ||
                pathname.startsWith(
                  `${item.href}/`,
                );

          return (
            <Link
              key={item.label}
              href={item.href}
              title={
                collapsed
                  ? item.label
                  : undefined
              }
              className={`group mb-1 flex items-center gap-3 rounded-[10px] px-3 py-2.5 font-mono text-[9px] tracking-[0.08em] transition-colors ${
                active
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]'
              } ${
                collapsed
                  ? 'justify-center'
                  : ''
              }`}
            >
              <Icon
                size={16}
                strokeWidth={
                  active ? 2 : 1.7
                }
                className="shrink-0"
              />

              {!collapsed && (
                <span
                  className={
                    active
                      ? 'font-medium'
                      : ''
                  }
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* SETTINGS + LOGOUT + COLLAPSE */}

      <div className="border-t border-[var(--border)] px-2.5 py-3">
        <Link
          href="/settings"
          title={
            collapsed
              ? 'SETTINGS'
              : undefined
          }
          className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 font-mono text-[9px] tracking-[0.08em] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text)] ${
            collapsed
              ? 'justify-center'
              : ''
          }`}
        >
          <Settings
            size={16}
            strokeWidth={1.7}
          />

          {!collapsed && (
            <span>SETTINGS</span>
          )}
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          title={
            collapsed
              ? 'LOG OUT'
              : undefined
          }
          className={`mt-1 flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 font-mono text-[9px] tracking-[0.08em] text-[var(--text-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] ${
            collapsed
              ? 'justify-center'
              : ''
          }`}
        >
          <LogOut
            size={16}
            strokeWidth={1.7}
          />

          {!collapsed && (
            <span>LOG OUT</span>
          )}
        </button>

        <button
          type="button"
          onClick={onToggle}
          className={`mt-3 flex w-full items-center justify-center rounded-[10px] border border-[var(--border)] py-1.5 text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]`}
          title={
            collapsed
              ? 'Expand navigation'
              : 'Collapse navigation'
          }
        >
          {collapsed ? (
            <ChevronRight
              size={15}
              strokeWidth={1.7}
            />
          ) : (
            <ChevronLeft
              size={15}
              strokeWidth={1.7}
            />
          )}
        </button>
      </div>
    </aside>
  );
}