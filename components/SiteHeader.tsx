import Link from 'next/link';
import { GITHUB_PUBLIC, GITHUB_URL } from '@/lib/config';
import { fetchGithubStars, formatStars } from '@/lib/github';
import { Lockup } from './Lockup';

const LINKS = [
  { href: '/docs#tools', label: 'Tools' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
];

const navLink = 'inline-flex min-h-10 items-center rounded-lg px-3 text-muted transition-colors hover:bg-surface hover:text-ink';

export const SiteHeader = async () => {
  const stars = await fetchGithubStars();
  return (
  <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
      <Lockup />
      <nav aria-label="Main" className="order-3 -mx-3 flex w-full items-center gap-0.5 overflow-x-auto text-sm font-medium sm:order-none sm:mx-0 sm:w-auto">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={navLink}>
            {link.label}
          </Link>
        ))}
        {GITHUB_PUBLIC ? (
          <a href={GITHUB_URL} className={`${navLink} gap-1.5`}>
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
            {stars !== null ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 font-mono text-xs text-ink" aria-label={`${stars} stars on GitHub`}>
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3 text-faint" fill="currentColor">
                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z" />
                </svg>
                {formatStars(stars)}
              </span>
            ) : null}
          </a>
        ) : null}
      </nav>
      <div className="flex items-center gap-1">
        <Link href="/app" className={`${navLink} text-sm font-medium`}>
          Sign in
        </Link>
        <Link
          href="/#get-key"
          className="hidden min-h-10 items-center rounded-lg bg-ink px-3.5 text-sm font-medium text-white transition-colors hover:bg-black sm:inline-flex"
        >
          Get a key
        </Link>
      </div>
    </div>
  </header>
  );
};
