import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyFlow } from '@/components/KeyFlow';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { GITHUB_URL, OUTRANK_URL } from '@/lib/config';
import { fetchPricing, linkPriceUsd } from '@/lib/pricing';

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: 'SEOforAgent: the SEO tool for AI agents' },
  description:
    'Your agent does your SEO and gets you recommended by AI. SEOforAgent gives Claude, ChatGPT, Codex and Cursor the data, the listicles and the backlinks. From $9 a month.',
  alternates: { canonical: '/' },
};

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
    body: 'Keyword research, live Google results, domain traffic, backlink profiles and rank checks. Real data from the same provider the big tools use.',
    price: 'From $0.004 per lookup',
    href: '/docs#tool-keywords_research',
  },
  {
    title: 'Listicle hunt',
    body: 'Finds the "best X" lists that rank in Google or are cited by AI assistants, scores them and tells you which are worth paying to be on.',
    price: '$0.50 per query',
    href: '/docs#tool-listicles_find',
  },
  {
    title: 'Backlinks',
    body: `Your agent turns credit into Outrank backlink credits and sets a budget. Outrank places the links on real sites. A DR 50 link is $${linkPriceUsd(50)}.`,
    price: '$0.80 per backlink credit',
    href: '/docs#billing',
  },
];

const COMPARISON = [
  { label: 'Starting price', values: ['$9 a month', '$10 a month', '$129 a month (Lite)', '$139.95 a month (Pro)'] },
  { label: 'Built for agents', values: ['Yes, dollar cost in every response', 'Yes, 85 tools', 'Dashboard first', 'Dashboard first'] },
  { label: 'Finds listicles cited by AI', values: ['Yes', 'No', 'No', 'No'] },
  { label: 'Buys backlinks for you', values: ['Yes, through Outrank', 'No, data only', 'No', 'No'] },
];

const HomePage = async () => {
  const pricing = await fetchPricing();
  const plans = pricing.plans;
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 pt-12 text-center sm:px-6 sm:pt-16">
          <p className="rounded-full bg-accent-soft px-4 py-1.5 text-sm font-semibold text-accent-hover">Works with Claude, ChatGPT, Codex and Cursor</p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">The SEO tool for AI agents</h1>
          <p className="max-w-2xl text-lg text-pretty text-muted sm:text-xl">
            Your agent does your SEO and gets you recommended by AI. We give it the data, the listicles and the backlinks.
          </p>
        </section>

        <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
          <KeyFlow mode="home" plans={plans} presetsUsd={pricing.credit.presetsUsd} minUsd={pricing.credit.minUsd} maxUsd={pricing.credit.maxUsd} />
        </div>

        <section aria-labelledby="outcomes" className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <h2 id="outcomes" className="text-center text-3xl font-semibold tracking-tight">
            Two outcomes, one agent
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {OUTCOMES.map((outcome) => (
              <article key={outcome.title} className="flex flex-col gap-3 rounded-2xl border border-line p-6">
                <h3 className="text-xl font-semibold">{outcome.title}</h3>
                <p className="text-muted">{outcome.body}</p>
                <ul className="mt-1 flex flex-wrap gap-2" aria-label={`Tools for ${outcome.title.toLowerCase()}`}>
                  {outcome.tools.map((tool) => (
                    <li key={tool}>
                      <Link href={`/docs#tool-${tool}`} className="inline-flex min-h-9 items-center rounded-md bg-surface px-2.5 font-mono text-[13px] text-ink hover:bg-line">
                        {tool}
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="capabilities" className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <h2 id="capabilities" className="text-center text-3xl font-semibold tracking-tight">
            What your agent can do
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {CAPABILITIES.map((item) => (
              <article key={item.title} className="flex flex-col gap-3 rounded-2xl bg-surface p-6">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="flex-1 text-muted">{item.body}</p>
                <p className="font-mono text-sm font-semibold">{item.price}</p>
                <Link href={item.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline-offset-2 hover:underline">
                  How it works
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="compare" className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <h2 id="compare" className="text-center text-3xl font-semibold tracking-tight">
            How it compares
          </h2>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <caption className="sr-only">SEOforAgent compared with OpenSEO, Ahrefs and Semrush</caption>
              <thead className="bg-surface">
                <tr>
                  <th scope="col" className="p-4 font-semibold">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    SEOforAgent
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    OpenSEO
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    Ahrefs
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    Semrush
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <th scope="row" className="p-4 font-medium">
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td key={index} className={`p-4 ${index === 0 ? 'font-semibold text-ink' : 'text-muted'}`}>
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-faint">
            Public prices and features as of 19 Nov 2026. OpenSEO: data at provider cost plus 28%, 85 tools, no listicle finder, no link buying.
          </p>
        </section>

        <section aria-labelledby="plans" className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="plans" className="text-3xl font-semibold tracking-tight">
                Plans
              </h2>
              <p className="mt-2 text-muted">Every plan includes more usage than it costs. Or buy credit once, from $10.</p>
            </div>
            <Link href="/pricing" className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline">
              See all prices
            </Link>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {plans.map((plan) => (
              <li key={plan.id} className="flex flex-col gap-1 rounded-2xl border border-line p-5">
                <span className="font-semibold">{plan.name}</span>
                <span className="font-mono text-2xl font-semibold">
                  ${plan.priceUsd}
                  <span className="text-sm font-normal text-muted"> a month</span>
                </span>
                <span className="text-sm text-muted">${plan.includedUsd.toLocaleString('en-US')} of usage included</span>
                <span className="text-sm text-muted">
                  {plan.projects} {plan.projects === 1 ? 'project' : 'projects'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-2xl border border-line p-6">
              <h2 className="text-lg font-semibold">
                by{' '}
                <a href={OUTRANK_URL} className="text-outrank hover:underline">
                  Outrank
                </a>
                , the SEO platform behind 750M+ organic views
              </h2>
              <p className="text-muted">Same data, same backlink network and the same team. SEOforAgent is the agent-first front on it.</p>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-line p-6">
              <h2 className="text-lg font-semibold">The client is open source. The service runs on Outrank.</h2>
              <p className="text-muted">
                This site, the MCP server, the skills and the plugin are MIT licensed.{' '}
                <a href={GITHUB_URL} className="font-medium text-ink underline">
                  Read the code on GitHub
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="flex flex-col gap-5 rounded-3xl bg-outrank p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div className="flex max-w-2xl flex-col gap-2">
              <h2 className="text-2xl font-semibold">Prefer it hands-off?</h2>
              <p className="text-lg text-white/90">Outrank writes and publishes daily, and includes SEOforAgent, for $99 a month.</p>
            </div>
            <a href={OUTRANK_URL} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-white px-6 font-semibold text-ink hover:bg-white/90">
              See Outrank
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
};

export default HomePage;
