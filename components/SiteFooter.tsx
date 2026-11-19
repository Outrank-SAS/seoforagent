import Link from 'next/link';
import { GITHUB_URL, OUTRANK_URL, SUPPORT_EMAIL } from '@/lib/config';
import { ByOutrank, LogoMark } from './Lockup';

export const SiteFooter = () => (
  <footer className="mt-24 border-t border-line bg-white">
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 font-semibold">
          <LogoMark />
          SEOforAgent
          <ByOutrank />
        </span>
        <p className="max-w-sm text-sm text-muted">The SEO tool for AI agents. The client is open source under MIT. The service runs on Outrank.</p>
      </div>
      <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-1 text-sm sm:grid-cols-3">
        <Link href="/docs" className="inline-flex min-h-11 items-center text-muted hover:text-ink">
          Docs
        </Link>
        <Link href="/pricing" className="inline-flex min-h-11 items-center text-muted hover:text-ink">
          Pricing
        </Link>
        <a href={GITHUB_URL} className="inline-flex min-h-11 items-center text-muted hover:text-ink">
          GitHub
        </a>
        <a href="https://status.outrank.so" className="inline-flex min-h-11 items-center text-muted hover:text-ink">
          Status
        </a>
        <a href={`${OUTRANK_URL}/terms`} className="inline-flex min-h-11 items-center text-muted hover:text-ink">
          Terms
        </a>
        <a href={`${OUTRANK_URL}/privacy`} className="inline-flex min-h-11 items-center text-muted hover:text-ink">
          Privacy
        </a>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-11 items-center text-muted hover:text-ink">
          Support
        </a>
        <Link href="/llms.txt" className="inline-flex min-h-11 items-center text-muted hover:text-ink">
          llms.txt
        </Link>
      </nav>
    </div>
  </footer>
);
