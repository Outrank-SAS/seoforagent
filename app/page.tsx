import type { Metadata } from 'next';
import Link from 'next/link';
import { DomainDemo } from '@/components/DomainDemo';
import { KeyFlow } from '@/components/KeyFlow';
import { SessionDemo } from '@/components/SessionDemo';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { GITHUB_PUBLIC, GITHUB_URL, OUTRANK_URL } from '@/lib/config';
import { LINK_EXAMPLE_DR, creditsToUsd, fetchPricing, linkCredits, linkPriceUsd, type LinkProductId, type Pricing } from '@/lib/pricing';

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: 'SEOforAgent: the SEO tool for AI agents' },
  description:
    'Your agent does your SEO and gets you recommended by AI. SEOforAgent gives Claude, ChatGPT, Codex and Cursor the data, the listicles and the backlinks. From $9 a month.',
  alternates: { canonical: '/' },
};

const AGENT_NAMES = ['Claude', 'ChatGPT', 'Codex', 'Cursor'];

const OUTCOMES = [
  {
    title: 'Rank on Google',
    body: 'Your agent finds the keywords you can win, reads who ranks today, tracks your positions and plans the links that move them.',
    tools: ['keywords_research', 'serp_results', 'domain_keywords', 'gsc_performance', 'rank_check', 'backlinks_suggest'],
  },
  {
    title: 'Get cited by AI',
    body: 'Your agent asks ChatGPT, Perplexity, Gemini and Claude what they recommend, tells you why you are left out and what to do about it, then finds the lists they cite and drafts the pitch to get on them.',
    tools: ['ai_visibility_check', 'ai_visibility_diagnose', 'listicles_find', 'listicles_get', 'listicles_pitch', 'backlinks_buying_set'],
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
    title: 'Backlinks and listicles',
    body: `Your agent sets a monthly budget and Outrank places links on real sites. A backlink inside an article is $${linkPriceUsd('backlink', LINK_EXAMPLE_DR)} at DR ${LINK_EXAMPLE_DR}. A spot in a "best X" list article is $${linkPriceUsd('listicle', LINK_EXAMPLE_DR)} at DR ${LINK_EXAMPLE_DR}.`,
    price: 'From $1.60 per DR point',
    href: '/pricing#backlinks',
  },
];

type Cell = boolean | string;

const COMPARISON: { label: string; values: Cell[] }[] = [
  { label: 'Starting price', values: ['$9 a month', '$10 a month', '$129 a month', '$139.95 a month'] },
  { label: 'Made for AI agents', values: [true, true, false, false] },
  { label: 'Cost reported on every call', values: [true, false, false, false] },
  { label: 'Finds the lists AI assistants cite', values: [true, false, false, false] },
  { label: 'Places backlinks and listicles for you', values: [true, false, false, false] },
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

interface FaqItem {
  q: string;
  a: string;
}

const dollars = (value: number): string => `$${value.toLocaleString('en-US')}`;

const listOf = (values: string[]): string => (values.length > 1 ? `${values.slice(0, -1).join(', ')} or ${values[values.length - 1]}` : values.join(''));

const buildFaq = (pricing: Pricing): FaqItem[] => {
  const { plans, credit, backlinks } = pricing;
  const exampleOf = (id: LinkProductId): string => {
    const { creditsPerDr } = backlinks.products[id];
    return `DR x ${creditsPerDr} credits, so ${dollars(creditsToUsd(linkCredits(id, LINK_EXAMPLE_DR, creditsPerDr), backlinks.creditUsd))} at DR ${LINK_EXAMPLE_DR}`;
  };
  return [
    {
      q: 'What does it cost?',
      a: `Plans are ${listOf(plans.map((plan) => dollars(plan.priceUsd)))} a month and include ${listOf(plans.map((plan) => dollars(plan.includedUsd)))} of usage. Data calls cost the provider price plus 28%, and every call reports what it cost in dollars.`,
    },
    {
      q: 'Do I need a subscription?',
      a: `No. You can buy credit once, from ${dollars(credit.minUsd)} to ${dollars(credit.maxUsd)}, and it does not reset.`,
    },
    {
      q: 'Which agents work?',
      a: 'Claude Code, Codex, Cursor, the Claude app and ChatGPT, and any other client that speaks MCP over HTTP. There is a REST API for everything else.',
    },
    {
      q: 'Where does the data come from?',
      a: 'Keyword, search and backlink data comes from DataForSEO, the provider behind many SEO tools. AI visibility checks query the real assistants: ChatGPT, Perplexity, Gemini and Claude.',
    },
    {
      q: 'How does backlink buying work?',
      a: `Your agent buys Outrank backlink credits at $${backlinks.creditUsd.toFixed(2)} each, and they pay for two products. A backlink is a contextual link to your page inside an article on a real site: ${exampleOf('backlink')}, at most ${backlinks.products.backlink.maxLinksPerDay ?? 2} a day. A listicle is your brand placed as an entry in a "best X" list article: ${exampleOf('listicle')}. Each has its own monthly budget, and a lost link is refunded in credits.`,
    },
    {
      q: 'Is my key safe?',
      a: 'The key is created in your browser and does nothing until you activate it. You can revoke it in the dashboard at any time, and spend limits cap what an agent can use.',
    },
  ];
};

const faqJsonLd = (items: FaqItem[]): string =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
  }).replace(/</g, '\\u003c');

const HomePage = async () => {
  const pricing = await fetchPricing();
  const plans = pricing.plans;
  const faq = buildFaq(pricing);
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

          <div className="mx-auto flex max-w-[860px] flex-col gap-5 px-4 pt-12 sm:px-6">
            <KeyFlow mode="home" plans={plans} presetsUsd={pricing.credit.presetsUsd} minUsd={pricing.credit.minUsd} maxUsd={pricing.credit.maxUsd} />
            <DomainDemo />
          </div>
        </div>

        <section aria-labelledby="session" className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
          <SectionHeading
            id="session"
            title="Ask in plain words. Your agent does the rest."
            subtitle="Every call says what it found and what it cost, so your agent can plan and you never get a surprise bill."
          />
          <SessionDemo />
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
          <p className="mt-3 text-sm text-faint">
            Public prices and features as of 19 Nov 2026. Ahrefs Lite and Semrush Pro, billed monthly.{' '}
            <Link href="/vs/openseo" className="text-muted underline underline-offset-2 hover:text-ink">
              SEOforAgent vs OpenSEO in detail
            </Link>
          </p>
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

        <section aria-labelledby="faq" className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
            <SectionHeading id="faq" title="Questions" subtitle="Short answers. The docs have the long ones." />
            <div>
              <div className="divide-y divide-line border-y border-line">
                {faq.map((item) => (
                  <details key={item.q} className="group py-1.5">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <span aria-hidden="true" className="font-mono text-lg text-faint transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="max-w-2xl pb-4 text-pretty text-muted">{item.a}</p>
                  </details>
                ))}
              </div>
              {GITHUB_PUBLIC ? (
                <p className="mt-5 text-sm text-muted">
                  The SEOforAgent client is open source under MIT on{' '}
                  <a href={GITHUB_URL} className="font-medium text-ink underline underline-offset-2">
                    GitHub
                  </a>
                  . The service runs on Outrank.
                </p>
              ) : null}
            </div>
          </div>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd(faq) }} />
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
