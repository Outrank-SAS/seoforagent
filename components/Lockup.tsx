import Link from 'next/link';
import { OUTRANK_URL } from '@/lib/config';

export const LogoMark = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-6 w-6 ${className}`}>
    <rect width="24" height="24" rx="6" fill="#0d0d12" />
    <path d="M7 8.5l3.5 3.5L7 15.5" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="12.5" y="14" width="5" height="2" rx="1" fill="#c2410c" />
  </svg>
);

export const ByOutrank = ({ className = '' }: { className?: string }) => (
  <a
    href={OUTRANK_URL}
    className={`inline-flex translate-y-px items-center text-[13px] font-medium whitespace-nowrap text-faint transition-colors hover:text-outrank ${className}`}
  >
    by Outrank
  </a>
);

export const Lockup = ({ href = '/' }: { href?: string }) => (
  <span className="inline-flex items-center gap-2">
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 text-lg font-semibold tracking-tight text-ink">
      <LogoMark />
      <span>SEOforAgent</span>
    </Link>
    <ByOutrank />
  </span>
);
