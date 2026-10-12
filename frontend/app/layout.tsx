import type { Metadata } from 'next';

import {
  Geist,
  Geist_Mono,
} from 'next/font/google';

import './globals.css';

import AuthGuard from '../components/auth/AuthGuard';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Stockpile',
  description:
    'Inventory management system',
};

export default function RootLayout({
  children,
}: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] font-sans text-[var(--foreground)]">
        <AuthGuard>
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}