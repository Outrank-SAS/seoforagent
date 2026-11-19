import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyFlow } from '@/components/KeyFlow';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { GITHUB_PUBLIC, GITHUB_URL, OUTRANK_URL } from '@/lib/config';
import { fetchPricing, linkPriceUsd } from '@/lib/pricing';

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: 'SEOforAgent: the SEO tool for AI agents' },
  description:
    'Your agent does your SEO and gets you recommended by AI. SEOforAgent gives Claude, ChatGPT, Codex and Cursor the data, the listicles and the backlinks. From $9 a month.',
  alternates: { canonical: '/' },
};

const AGENT_NAMES = ['Claude', 'ChatGPT', 'Codex', 'Cursor'];

const SESSION = [
  {
    tool: 'ai_visibility_check',
    args: '1 prompt, 4 assistants',
    cost: '$0.20',
    result: 'Mentioned in 0 of 4 answers. Most cited: freebeat.ai, cybernews.com, stork.ai',
  },
  {
    tool: 'listicles_find',
    args: '"best ai music video generator"',
    cost: '$0.50',
    result: '78 lists rank on Google or are cited by AI. 3 are worth paying to be on.',
  },
  {
    tool: 'backlinks_suggest',
    args: 'vs invideo.io, pictory.ai',
    cost: '$0.28',
    result: '25 sites link to both and not to you. Outrank can place DR 40+ links from $128.',
  },
];

const OUTCOMES = [
  {
    title: 'Rank on Google',
    body: 'Your agent finds the keywords you can win, reads who ranks today, tracks your positions and plans the links that move them.',
    tools: ['keywords_research', 'serp_results', 'domain_keywords', 'gsc_performance', 'rank_check', 'backlinks_suggest'],
  },
  {
    title: 'Get cited by AI',
    body: 'Your agent asks ChatGPT, Perplexity, Gemini and Claude what they recommend, then finds the lists they cite and drafts the pitch to get on them.',
    tools: ['ai_visibility_check', 'listicles_find', 'listicles_get', 'listicles_pitch', 'backlinks_buying_set'],
  },
];

const CAPABILITIES = [
  {
    title: 'SEO data',
    body: 'Keyword research, live Google results, domain traffic, backlink profiles and rank checks, from the same provider the big tools use.',
    price: 'From $0.004 a lookup',
    href: '/docs#tool-keywords_research',
  },
  {
    title: 'Listicle hunt',
    body: 'Finds the "best X" lists that rank on Google or are cited by AI assistants, scores them, and tells you which are worth paying to be on.',
    price: '$0.50 a query',
    href: '/docs#tool-listicles_find',
  },
  {
    title: 'Backlinks',
    body: `Your agent turns credit into Outrank backlink credits and sets a monthly budget. Outrank places the links on real sites. A DR 50 link is $${linkPriceUsd(50)}.`,
    price: '$0.80 a backlink credit',
    href: '/docs#billing',
  },
];

type Cell = boolean | string;

const COMPARISON: { label: string; values: Cell[] }[] = [
  { label: 'Starting price', values: ['$9 a month', '$10 a month', '$129 a month', '$139.95 a month'] },
  { label: 'Made for AI agents', values: [true, true, false, false] },
  { label: 'Cost reported on every call', values: [true, false, false, false] },
  { label: 'Finds the lists AI assistants cite', values: [true, false, false, false] },
  { label: 'Places backlinks for you', values: [true, false, false, false] },
];

const COLUMNS = ['SEOforAgent', 'OpenSEO', 'Ahrefs', 'Semrush'];

const Check = ({ on }: { on: boolean }) =>
  on ? (
    <svg role="img" aria-label="Yes" viewBox="0 0 16 16" className="h-4 w-4 text-ok" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  ) : (
    <svg role="img" aria-label="No" viewBox="0 0 16 16" className="h-4 w-4 text-faint/70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4.5 8h7" />
    </svg>
  );

const SectionHeading = ({ id, title, subtitle }: { id: string; title: string; subtitle: string }) => (
  <div className="flex max-w-2xl flex-col gap-2">
    <h2 id={id} className="text-2xl font-semibold tracking-tight sm:text-3xl">
      {title}
    </h2>
    <p className="text-pretty text-muted">{subtitle}</p>
  </div>
);

const HomePage = async () => {
  const pricing = await fetchPricing();
  const plans = pricing.plans;
  return (
    <>
      <SiteHeader />
      <main id="main">
        <div className="relative isolate">
          <div
            aria-hidden="true"
            className="bg-dots absolute inset-x-0 top-0 -z-10 h-[520px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]"
          />
          <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pt-16 text-center sm:px-6 sm:pt-24">
            <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 font-mono text-xs text-muted sm:gap-x-2 sm:text-[13px]">
              <span aria-hidden="true" className="text-accent">
                ❯
              </span>
              <span>works with</span>
              {AGENT_NAMES.map((name, index) => (
                <span key={name} className="inline-flex items-center gap-2">
                  <span className="font-medium text-ink">{name}</span>
                  {index < AGENT_NAMES.length - 1 ? (
                    <span aria-hidden="true" className="text-faint/50">
                      /
                    </span>
                  ) : null}
                </span>
              ))}
              <span aria-hidden="true" className="caret inline-block h-[15px] w-[7px] translate-y-[2px] bg-accent" />
            </p>
            <h1 className="text-[2.75rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-7xl">The SEO tool for AI agents</h1>
            <p className="max-w-xl text-lg leading-relaxed text-balance text-muted sm:text-xl">
              Your agent does your SEO and gets you recommended by AI. We give it the data, the listicles and the backlinks.
            </p>
          </section>

          <div className="mx-auto max-w-[860px] px-4 pt-12 sm:px-6">
            <KeyFlow mode="home" plans={plans} presetsUsd={pricing.credit.presetsUsd} minUsd={pricing.credit.minUsd} maxUsd={pricing.credit.maxUsd} />
          </div>
        </div>

        <section aria-labelledby="session" className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
          <SectionHeading
            id="session"
            title="Ask in plain words. Your agent does the rest."
            subtitle="Every call says what it found and what it cost, so your agent can plan and you never get a surprise bill."
          />
          <figure className="mt-8 overflow-hidden rounded-2xl border border-ink/90 bg-ink text-white shadow-[0_24px_48px_-24px_rgba(13,13,18,0.45)]">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
              <span aria-hidden="true" className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              </span>
              <span className="ml-2 font-mono text-xs text-white/50">claude · seoforagent</span>
            </div>
            <div className="flex flex-col gap-6 p-5 font-mono text-[13px] leading-relaxed sm:p-7">
              <p className="text-white">
                <span aria-hidden="true" className="mr-2 text-accent">
                  ❯
                </span>
                How do I get recommended by ChatGPT for &quot;ai music video generator&quot;?
              </p>
              <ol className="flex flex-col gap-5">
                {SESSION.map((step) => (
                  <li key={step.tool} className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <span>
                        <span aria-hidden="true" className="mr-2 text-[#4ade80]">
                          ●
                        </span>
                        <span className="text-white">{step.tool}</span>
                        <span className="text-white/40"> {step.args}</span>
                      </span>
                      <span className="text-white/60">{step.cost}</span>
                    </div>
                    <p className="pl-5 text-white/60">{step.result}</p>
                  </li>
                ))}
              </ol>
              <p className="border-t border-white/10 pt-5 text-white/80">
                Here is the plan: get onto stork.ai and cybernews.com first, pitch drafts are ready. Spent $0.98, $8.02 of usage left this month.
              </p>
            </div>
            <figcaption className="sr-only">Example session in Claude with SEOforAgent connected</figcaption>
          </figure>
          <p className="mt-3 text-sm text-faint">Example session. Prices are the real per-call prices.</p>
        </section>

        <section aria-labelledby="outcomes" className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
          <SectionHeading id="outcomes" title="Two outcomes, one agent" subtitle="Rank on Google and get named by AI assistants, from the same tools." />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {OUTCOMES.map((outcome) => (
              <article key={outcome.title} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 sm:p-7">
                <h3 className="text-lg font-semibold tracking-tight">{outcome.title}</h3>
                <p className="text-muted">{outcome.body}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Tools for ${outcome.title.toLowerCase()}`}>
                  {outcome.tools.map((tool) => (
                    <li key={tool}>
                      <Link
                        href={`/docs#tool-${tool}`}
                        className="inline-flex min-h-8 items-center rounded-md border border-line px-2 font-mono text-xs text-muted transition-colors hover:border-ink/30 hover:text-ink"
                      >
                        {tool}
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="capabilities" className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
          <SectionHeading id="capabilities" title="What your agent can do" subtitle="Real data, real lists, real links. Priced per call in dollars." />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {CAPABILITIES.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 transition-colors hover:border-ink/25"
              >
                <h3 className="flex items-center justify-between text-lg font-semibold tracking-tight">
                  {item.title}
                  <span aria-hidden="true" className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink">
                    →
                  </span>
                </h3>
                <p className="flex-1 text-muted">{item.body}</p>
                <p className="border-t border-line pt-3 font-mono text-sm text-ink">{item.price}</p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="compare" className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
          <SectionHeading id="compare" title="How it compares" subtitle="The same data the big tools use, and the actions they leave to you." />
          <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <caption className="sr-only">SEOforAgent compared with OpenSEO, Ahrefs and Semrush</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-[34%] p-4 font-medium text-muted">
                    <span className="sr-only">Feature</span>
                  </th>
                  {COLUMNS.map((name, index) => (
                    <th key={name} scope="col" className={`p-4 font-semibold ${index === 0 ? 'bg-accent-soft/60 text-ink' : 'text-muted'}`}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <th scope="row" className="p-4 font-medium text-ink">
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td key={index} className={`p-4 ${index === 0 ? 'bg-accent-soft/60 font-semibold text-ink' : 'text-muted'}`}>
                        {typeof value === 'boolean' ? <Check on={value} /> : value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-faint">Public prices and features as of 19 Nov 2026. Ahrefs Lite and Semrush Pro, billed monthly.</p>
        </section>

        <section aria-labelledby="plans" className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading id="plans" title="Plans" subtitle="Every plan above Starter includes more usage than it costs. Or buy credit once, from $10." />
            <Link href="/pricing" className="inline-flex min-h-11 items-center gap-1 font-medium text-ink hover:text-accent">
              All prices
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {plans.map((plan) => (
              <li key={plan.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
                <span className="text-sm font-medium text-muted">{plan.name}</span>
                <span className="font-mono text-3xl font-semibold tracking-tight">
                  ${plan.priceUsd}
                  <span className="font-sans text-sm font-normal tracking-normal text-muted"> /month</span>
                </span>
                <span className="flex flex-col gap-1 border-t border-line pt-4 text-sm text-muted">
                  <span>
                    <span className="font-medium text-ink">${plan.includedUsd.toLocaleString('en-US')}</span> of usage
                  </span>
                  <span>
                    {plan.projects} {plan.projects === 1 ? 'website' : 'websites'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
          <div className="flex flex-col gap-6 rounded-3xl bg-outrank-soft p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div className="flex max-w-2xl flex-col gap-2">
              <p className="text-sm font-medium text-outrank">
                Built by{' '}
                <a href={OUTRANK_URL} className="underline-offset-2 hover:underline">
                  Outrank
                </a>
                , the SEO platform behind 750M+ organic views
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">Rather have it done for you?</h2>
              <p className="text-muted">
                Outrank writes and publishes an article every day and builds backlinks automatically, for $99 a month. SEOforAgent is included.
                {GITHUB_PUBLIC ? (
                  <>
                    {' '}
                    The SEOforAgent client is open source on{' '}
                    <a href={GITHUB_URL} className="font-medium text-ink underline">
                      GitHub
                    </a>
                    .
                  </>
                ) : null}
              </p>
            </div>
            <a
              href={OUTRANK_URL}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-outrank px-6 font-semibold text-white transition-colors hover:bg-[#7420e0]"
            >
              See Outrank
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
};

export default HomePage;
