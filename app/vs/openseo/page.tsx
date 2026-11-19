import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { FALLBACK_PLANS, linkPriceUsd } from '@/lib/pricing';
import { buttonPrimary, buttonSecondary } from '@/lib/styles';
import { TOOLS } from '@/lib/tools';

const AS_OF = '19 Nov 2026';

export const metadata: Metadata = {
  title: 'SEOforAgent vs OpenSEO',
  description:
    'An honest comparison of SEOforAgent and OpenSEO, two SEO tools built for AI agents on DataForSEO data: price, tools, open source, site audits, listicles and backlinks.',
  alternates: { canonical: '/vs/openseo' },
  openGraph: { title: 'SEOforAgent vs OpenSEO', url: '/vs/openseo' },
};

type Cell = string | boolean;

const priceFrom = Math.min(...FALLBACK_PLANS.map((plan) => plan.priceUsd));

const ROWS: { label: string; sfa: Cell; openseo: Cell }[] = [
  { label: 'Starting price', sfa: `$${priceFrom} a month, or credit once from $10`, openseo: 'From $10 a month' },
  { label: 'Built for AI agents', sfa: true, openseo: true },
  { label: 'Data source', sfa: 'DataForSEO', openseo: 'DataForSEO' },
  { label: 'Tools', sfa: String(TOOLS.length), openseo: '85' },
  { label: 'Open source', sfa: 'The client, under MIT', openseo: 'Yes' },
  { label: 'Self-hostable', sfa: 'No, the service runs on Outrank', openseo: true },
  { label: 'Site audits', sfa: 'Not yet', openseo: true },
  { label: 'Local SEO', sfa: false, openseo: true },
  { label: 'GA4', sfa: false, openseo: true },
  { label: 'Dollar cost reported on every call', sfa: true, openseo: false },
  { label: 'Finds the listicles AI assistants cite', sfa: true, openseo: false },
  { label: 'Places backlinks for you', sfa: 'Yes, through Outrank', openseo: false },
];

const Mark = ({ on }: { on: boolean }) =>
  on ? (
    <svg role="img" aria-label="Yes" viewBox="0 0 16 16" className="h-4 w-4 text-ok" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  ) : (
    <svg role="img" aria-label="No" viewBox="0 0 16 16" className="h-4 w-4 text-faint/70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4.5 8h7" />
    </svg>
  );

const CHOOSE = [
  {
    title: 'Pick OpenSEO if',
    points: [
      'You want to run the whole thing on your own server. It is open source and self-hostable.',
      'You need site audits, local SEO or GA4. SEOforAgent has no site audit yet, and no local SEO or GA4 tools.',
      'You want the widest toolbox. It has 85 tools.',
    ],
  },
  {
    title: 'Pick SEOforAgent if',
    points: [
      'You want your agent to know what it spends. Every response carries the dollar cost and the balance left.',
      'You care about being recommended by AI. It asks ChatGPT, Perplexity, Gemini and Claude, then finds the lists they cite.',
      `You want links placed, not only analysed. Your agent sets a budget and Outrank places them, from $${linkPriceUsd(30)} for a DR 30 link.`,
    ],
  },
];

const VsOpenSeoPage = () => (
  <>
    <SiteHeader />
    <main id="main" className="mx-auto flex max-w-[860px] flex-col px-4 pt-14 sm:px-6 sm:pt-20">
      <p className="font-mono text-[13px] text-muted">
        <span aria-hidden="true" className="mr-2 text-accent">
          ❯
        </span>
        compare, as of {AS_OF}
      </p>
      <h1 className="mt-4 text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-6xl">SEOforAgent vs OpenSEO</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-muted">
        Both give an AI agent SEO tools, and both run on DataForSEO data. They differ in what happens around the data: OpenSEO is open source and covers more ground, SEOforAgent
        reports every cost in dollars and acts on what it finds.
      </p>

      <section aria-labelledby="same" className="mt-16 flex flex-col gap-3">
        <h2 id="same" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          What is the same
        </h2>
        <p className="max-w-2xl text-pretty text-muted">
          Keyword research, search results, domain and backlink data come from the same provider in both, so the numbers your agent reads will be close. Both are built for
          agents first, not for a person clicking through a dashboard. Both start around ten dollars a month.
        </p>
      </section>

      <section aria-labelledby="table" className="mt-16 flex flex-col gap-5">
        <h2 id="table" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Side by side
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <caption className="sr-only">SEOforAgent compared with OpenSEO</caption>
            <thead>
              <tr>
                <th scope="col" className="w-[38%] p-4 font-medium text-muted">
                  <span className="sr-only">Feature</span>
                </th>
                <th scope="col" className="bg-accent-soft/60 p-4 font-semibold text-ink">
                  SEOforAgent
                </th>
                <th scope="col" className="p-4 font-semibold text-muted">
                  OpenSEO
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-t border-line">
                  <th scope="row" className="p-4 font-medium text-ink">
                    {row.label}
                  </th>
                  <td className="bg-accent-soft/60 p-4 font-medium text-ink">{typeof row.sfa === 'boolean' ? <Mark on={row.sfa} /> : row.sfa}</td>
                  <td className="p-4 text-muted">{typeof row.openseo === 'boolean' ? <Mark on={row.openseo} /> : row.openseo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-faint">Public prices and features as of {AS_OF}. Check both sites before you decide, since both change often.</p>
      </section>

      <section aria-labelledby="choose" className="mt-16 flex flex-col gap-5">
        <h2 id="choose" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Which one to pick
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {CHOOSE.map((group) => (
            <article key={group.title} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6">
              <h3 className="text-lg font-semibold tracking-tight">{group.title}</h3>
              <ul className="flex flex-col gap-3 text-muted">
                {group.points.map((point) => (
                  <li key={point} className="flex gap-2.5">
                    <span aria-hidden="true" className="font-mono text-faint">
                      –
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="max-w-2xl text-pretty text-muted">
          They also work together. Nothing stops an agent from having both connected: one for audits, one for AI visibility and links.
        </p>
      </section>

      <section className="mt-16 flex flex-col gap-5 rounded-2xl bg-ink p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-9">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-semibold tracking-tight">Try one lookup first</h2>
          <p className="text-white/65">The homepage runs a free domain lookup on your site, no key needed.</p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <Link href="/#get-key" className={`${buttonPrimary} min-h-12`}>
            Get a key
            <span aria-hidden="true">→</span>
          </Link>
          <Link href="/pricing" className={`${buttonSecondary} min-h-12`}>
            See pricing
          </Link>
        </div>
      </section>
    </main>
    <SiteFooter />
  </>
);

export default VsOpenSeoPage;
