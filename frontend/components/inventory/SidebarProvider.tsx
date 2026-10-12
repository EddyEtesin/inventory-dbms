'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const SIDEBAR_STORAGE_KEY =
  'stockpile.sidebar.collapsed';

type SidebarContextValue = {
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const SidebarContext =
  createContext<SidebarContextValue | null>(
    null,
  );

type SidebarProviderProps = {
  children: ReactNode;
};

export default function SidebarProvider({
  children,
}: SidebarProviderProps) {
  const [collapsed, setCollapsed] =
    useState(false);

  useEffect(() => {
    const storedValue =
      window.localStorage.getItem(
        SIDEBAR_STORAGE_KEY,
      );

    if (storedValue !== null) {
      setCollapsed(
        storedValue === 'true',
      );
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;

      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        String(next),
      );

      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      collapsed,
      toggleCollapsed,
    }),
    [collapsed, toggleCollapsed],
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(
    SidebarContext,
  );

  if (!context) {
    throw new Error(
      'useSidebar must be used inside SidebarProvider.',
    );
  }

  return context;
}