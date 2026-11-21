'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { summarizeAccount } from '@/lib/account';
import { api, errorMessage, type Envelope } from '@/lib/api';
import { formatUsd } from '@/lib/format';
import { getActiveKey, keySuffix, signOut as clearKey } from '@/lib/keys';
import { buttonPrimary, buttonSecondary } from '@/lib/styles';
import { Lockup } from '../Lockup';
import { DashboardContext } from './context';
import { SignIn } from './SignIn';

const NAV = [
  { href: '/app', label: 'Overview', icon: 'M3 12l9-8 9 8M5 10v10h14V10' },
  { href: '/app/billing', label: 'Plan and credit', icon: 'M3 7h18v10H3zM3 11h18' },
  { href: '/app/projects', label: 'Projects', icon: 'M4 5h16v14H4zM4 9h16' },
  { href: '/app/keys', label: 'Keys', icon: 'M14 10a4 4 0 1 1-1.2-2.8L21 7v3h-2v2h-2l-2.2 2.2' },
];

const NavIcon = ({ path }: { path: string }) => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const isActive = (pathname: string, href: string) => (href === '/app' ? pathname === '/app' : pathname.startsWith(href));

const INVALID_KEY_CODES = ['AUTH_KEY_INVALID', 'AUTH_KEY_REVOKED', 'UNAUTHORIZED', 'INVALID_API_KEY', 'API_KEY_REVOKED', 'INVALID_KEY'];

export const DashboardShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname() || '/app';
  const [apiKey, setApiKey] = useState<string | null | undefined>(undefined);
  const [whoami, setWhoami] = useState<Envelope | null>(null);
  const [whoamiStatus, setWhoamiStatus] = useState(0);
  const [whoamiLoading, setWhoamiLoading] = useState(true);

  useEffect(() => {
    const stored = getActiveKey();
    queueMicrotask(() => setApiKey((current) => (current && current === stored ? current : stored)));
  }, [pathname]);

  const fetchWhoami = useCallback(async (key: string) => {
    const result = await api('/sfa/whoami', { key });
    setWhoami(result.envelope);
    setWhoamiStatus(result.status);
    setWhoamiLoading(false);
  }, []);

  const loadWhoami = useCallback(
    async (key: string) => {
      setWhoamiLoading(true);
      await fetchWhoami(key);
    },
    [fetchWhoami],
  );

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    api('/sfa/whoami', { key: apiKey }).then((result) => {
      if (cancelled) return;
      setWhoami(result.envelope);
      setWhoamiStatus(result.status);
      setWhoamiLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const signOut = useCallback(() => {
    clearKey();
    setApiKey(null);
    setWhoami(null);
    setWhoamiLoading(true);
  }, []);

  if (pathname.startsWith('/app/auth')) return <>{children}</>;
  if (apiKey === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center" aria-busy="true">
        <span className="sr-only">Loading the dashboard</span>
      </div>
    );
  }
  if (!apiKey) return <SignIn onSignedIn={(key) => setApiKey(key)} />;

  const summary = whoami?.ok ? summarizeAccount(whoami.data) : null;
  const keyRejected = !whoamiLoading && whoami && !whoami.ok && (whoamiStatus === 401 || INVALID_KEY_CODES.includes(whoami.error?.code ?? ''));
  const notActive = !!summary && !summary.active;

  return (
    <DashboardContext.Provider value={{ apiKey, whoami, whoamiLoading, refreshWhoami: () => loadWhoami(apiKey), signOut }}>
      <div className="min-h-screen bg-surface pb-20 md:pb-0">
        <header className="sticky top-0 z-20 border-b border-line bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:gap-x-6 sm:px-6">
            <Lockup href="/app" />
            <dl className="order-3 flex w-full gap-5 overflow-x-auto text-sm md:order-none md:ml-auto md:w-auto">
              <div className="flex shrink-0 items-baseline gap-1.5">
                <dt className="text-muted">Included left</dt>
                <dd className="font-mono font-semibold">{summary ? formatUsd(summary.includedLeftUsd ?? 0, 2) : '...'}</dd>
              </div>
              <div className="flex shrink-0 items-baseline gap-1.5">
                <dt className="text-muted">Credit</dt>
                <dd className="font-mono font-semibold">{summary ? formatUsd(summary.creditUsd ?? 0, 2) : '...'}</dd>
              </div>
              <div className="flex shrink-0 items-baseline gap-1.5">
                <dt className="text-muted">Plan</dt>
                <dd className="font-semibold">
                  {summary?.planName ?? '...'}
                  {summary?.outrankIncluded ? <span className="ml-2 rounded-full bg-outrank-soft px-2 py-0.5 text-xs text-outrank">Included with your Outrank plan</span> : null}
                </dd>
              </div>
            </dl>
            <Link href="/app/billing#add-credit" className={`${buttonPrimary} ml-auto min-h-10 px-3 text-sm sm:px-4 md:ml-0`}>
              Add credit
            </Link>
          </div>
        </header>

        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
          <nav aria-label="Dashboard" className="hidden w-52 shrink-0 flex-col gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                  isActive(pathname, item.href) ? 'bg-ink text-white' : 'text-ink hover:bg-white'
                }`}
              >
                <NavIcon path={item.icon} />
                {item.label}
              </Link>
            ))}
            <button type="button" onClick={signOut} className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-muted hover:bg-white hover:text-ink">
              <NavIcon path="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
              Sign out
            </button>
            <p className="mt-4 px-3 font-mono text-xs text-faint">Signed in with {keySuffix(apiKey)}</p>
          </nav>

          <main id="main" className="min-w-0 flex-1">
            {keyRejected ? (
              <div role="alert" className="mb-5 flex flex-col gap-3 rounded-2xl bg-danger-soft p-4 text-danger sm:flex-row sm:items-center sm:justify-between">
                <p>This browser&apos;s key no longer works. It may have been revoked. Sign in again with another key or an email link.</p>
                <button type="button" onClick={signOut} className={`${buttonSecondary} text-ink`}>
                  Sign in again
                </button>
              </div>
            ) : null}
            {notActive ? (
              <div role="status" className="mb-5 flex flex-col gap-3 rounded-2xl bg-warn-soft p-4 text-warn sm:flex-row sm:items-center sm:justify-between">
                <p>This account has no plan or credit yet. Free tools and the dashboard work; paid tools need a plan or credit.</p>
                <Link href="/app/billing" className={`${buttonSecondary} text-ink`}>
                  Choose a plan
                </Link>
              </div>
            ) : null}
            {whoami && !whoami.ok && !keyRejected && !notActive ? (
              <div role="status" className="mb-5 rounded-2xl bg-warn-soft p-4 text-sm text-warn">
                We could not load your account right now. {errorMessage(whoami)}
              </div>
            ) : null}
            {children}
          </main>
        </div>

        <nav aria-label="Dashboard" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive(pathname, item.href) ? 'text-accent' : 'text-muted'}`}
            >
              <NavIcon path={item.icon} />
              {item.label === 'Plan and credit' ? 'Billing' : item.label}
            </Link>
          ))}
          <button type="button" onClick={signOut} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted">
            <NavIcon path="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
            Sign out
          </button>
        </nav>
      </div>
    </DashboardContext.Provider>
  );
};
