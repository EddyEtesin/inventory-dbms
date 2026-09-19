'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  Truck,
  Wrench,
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

  return (
    <aside
      className={`fixed left-0 top-0 z-40 hidden h-screen flex-col bg-[#2e4057] text-[#f5f0e3] md:flex ${
        collapsed ? 'w-[68px]' : 'w-[205px]'
      }`}
    >
      {/* BRAND */}
      <div className="flex min-h-[72px] items-center border-b border-[#f5f0e3]/15 px-4">
        {collapsed ? (
          <span className="mx-auto font-mono text-lg">IL</span>
        ) : (
          <div>
            <div className="font-mono text-[17px] tracking-[0.08em]">
              INVENTORY
            </div>

            <div className="font-mono text-[8px] tracking-[0.18em] text-[#ddd0b8]">
              LEDGER SYSTEM
            </div>
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-2.5 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;

          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`mb-1 flex items-center gap-3 px-3 py-2.5 font-mono text-[9px] tracking-widest ${
                active
                  ? 'bg-[#c68a2e] text-[#2b2620]'
                  : 'text-[#f5f0e3] hover:bg-[#f5f0e3]/10'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={16} strokeWidth={1.7} />

              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* SETTINGS + COLLAPSE */}
      <div className="border-t border-[#f5f0e3]/15 px-2.5 py-3">
        <Link
          href="/settings"
          title={collapsed ? 'SETTINGS' : undefined}
          className={`flex w-full items-center gap-3 px-3 py-2.5 font-mono text-[9px] tracking-widest hover:bg-[#f5f0e3]/10 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Settings size={16} strokeWidth={1.7} />

          {!collapsed && <span>SETTINGS</span>}
        </Link>

        <button
          type="button"
          onClick={onToggle}
          className="mt-2 flex w-full justify-center border border-[#f5f0e3]/20 py-1.5"
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? (
            <ChevronRight size={15} />
          ) : (
            <ChevronLeft size={15} />
          )}
        </button>
      </div>
    </aside>
  );
}