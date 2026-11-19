import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { OUTRANK_URL } from '@/lib/config';
import { LINK_EXAMPLE_DR, LINK_MIN_ALLOCATION_CREDITS, LINK_PRODUCTS, LINK_PRODUCT_IDS, creditsToUsd, fetchPricing, linkCredits } from '@/lib/pricing';
import { AREA_LABELS, TOOLS, TOOL_BY_NAME, type ToolArea } from '@/lib/tools';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'SEOforAgent plans from $9 a month with more usage included than they cost, one-time credit from $10 to $5,000, backlinks at $1.60 per DR point and listicle placements at $3.20 per DR point.',
  alternates: { canonical: '/pricing' },
};

const money = (value: number, digits = 0): string =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

const FAQ = [
  {
    q: 'What happens when usage runs out?',
    a: 'Paid tools stop with a clear message and a link to add credit or upgrade. Free tools, past results and the dashboard keep working. Nothing is charged without credit to cover it.',
  },
  {
    q: 'Does included usage roll over?',
    a: 'No. Included usage resets at each renewal. One-time credit does not reset and is spent after included usage.',
  },
  {
    q: 'Can my agent spend without limits?',
    a: 'No. Every account has a per-call and a daily spend limit, set in the dashboard. Agents can cap any call with max_cost_usd and price it first with dry_run.',
  },
  {
    q: 'How does scheduled tracking work?',
    a: 'On Growth and above, your agent or you pick keywords and AI prompts per project, and we re-check rankings daily or weekly and AI answers weekly. Each run is charged like the same manual call, and the dashboard shows the estimate before you save.',
  },
  {
    q: 'Are repeated calls charged again?',
    a: 'The same call from the same account within 24 hours is free, unless the agent asks for fresh data.',
  },
  {
    q: 'What is the difference between a backlink and a listicle?',
    a: 'A backlink is a contextual link to your page inside an article on a real site. It costs $1.60 per DR point, so $64 at DR 40. A listicle is your brand placed as an entry in a "best X" list article. It costs $3.20 per DR point, so $128 at DR 40. Both are paid from the same backlink credits, and each has its own monthly budget.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Write to support@outrank.so from the email you paid with. Charges for calls that failed are released automatically, so you never pay for an error.',
  },
  {
    q: 'How do I cancel or get invoices?',
    a: 'Open the dashboard, then Plan and credit, then Manage billing. Stripe handles invoices, card changes and cancellation. A cancelled plan runs until the end of the period.',
  },
  {
    q: 'Can my team use it?',
    a: 'Yes. Create one API key per person or agent in the dashboard. Every key draws on the same balance and shows up separately in the activity feed.',
  },
];

const PricingPage = async () => {
  const pricing = await fetchPricing();
  const grouped = new Map<ToolArea, { tool: string; unit: string }[]>();
  for (const row of pricing.tools) {
    const area = TOOL_BY_NAME.get(row.tool)?.area ?? 'account';
    grouped.set(area, [...(grouped.get(area) ?? []), { tool: row.tool, unit: row.unit }]);
  }
  const freeTools = TOOLS.filter((tool) => tool.kind !== 'paid' && tool.kind !== 'money').map((tool) => tool.name);
  const { creditUsd, minDr, maxDr, products } = pricing.backlinks;
  const linkRows = LINK_PRODUCT_IDS.map((id) => {
    const { creditsPerDr, maxLinksPerDay } = products[id];
    const costAt = (dr: number) => {
      const credits = linkCredits(id, dr, creditsPerDr);
      return { credits, usd: creditsToUsd(credits, creditUsd) };
    };
    return {
      id,
      name: LINK_PRODUCTS[id].name,
      role: LINK_PRODUCTS[id].role,
      what: LINK_PRODUCTS[id].what,
      creditsPerDr,
      maxLinksPerDay,
      perDrUsd: creditsToUsd(creditsPerDr, creditUsd),
      example: costAt(LINK_EXAMPLE_DR),
      low: costAt(minDr),
      high: costAt(maxDr),
    };
  });

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <div className="flex max-w-3xl flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
          <p className="text-lg text-muted">
            Pick a plan with usage included, or buy credit once. Every paid call reports its cost in dollars, and your agent sees the balance after each one.
          </p>
        </div>

        <section aria-labelledby="plans" className="mt-10">
          <h2 id="plans" className="sr-only">
            Plans
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <caption className="sr-only">Monthly plans</caption>
              <thead className="bg-surface">
                <tr>
                  <th scope="col" className="p-4 font-semibold">
                    Plan
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    Price
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    Usage included each month
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    Projects
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    Scheduled tracking
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    White-label reports
                  </th>
                </tr>
              </thead>
              <tbody>
                {pricing.plans.map((plan) => (
                  <tr key={plan.id} className="border-t border-line">
                    <th scope="row" className="p-4">
                      <span className="block font-semibold">{plan.name}</span>
                      <span className="block text-sm font-normal text-muted">{plan.tagline}</span>
                    </th>
                    <td className="p-4 font-mono font-semibold whitespace-nowrap">{money(plan.priceUsd)} a month</td>
                    <td className="p-4 font-mono">{money(plan.includedUsd)}</td>
                    <td className="p-4">{plan.projects}</td>
                    <td className="p-4">{plan.schedules ? 'Yes' : 'No'}</td>
                    <td className="p-4">{plan.whiteLabel ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
                <tr className="border-t border-line">
                  <th scope="row" className="p-4">
                    <span className="block font-semibold">Credit only</span>
                    <span className="block text-sm font-normal text-muted">No subscription</span>
                  </th>
                  <td className="p-4 font-mono font-semibold">
                    {money(pricing.credit.minUsd)} to {money(pricing.credit.maxUsd)} once
                  </td>
                  <td className="p-4">None, credit does not reset</td>
                  <td className="p-4">1</td>
                  <td className="p-4">No</td>
                  <td className="p-4">No</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link href="/activate" className="inline-flex min-h-11 items-center rounded-full bg-accent px-6 font-semibold text-white hover:bg-accent-hover">
              Get a key and activate
            </Link>
            {pricing.source === 'fallback' ? <p className="text-sm text-faint">Prices shown are the published list. Stripe shows the final amount.</p> : null}
          </div>
        </section>

        <section aria-labelledby="usage" className="mt-16 grid gap-8 lg:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-3">
            <h2 id="usage" className="text-2xl font-semibold">
              How usage works
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-muted">
              <li>Each paid call is held at its upper estimate, then charged what it really cost. Data tools cost the provider price × 1.28, rounded up to $0.001.</li>
              <li>Included usage is spent first. One-time credit is spent after it and does not reset.</li>
              <li>The same call within 24 hours is free. Dry runs are free.</li>
              <li>Every response shows the charge and both balances, so your agent can tell you what things cost.</li>
            </ul>
            <h3 className="mt-4 font-semibold">Always free</h3>
            <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="Free tools">
              {freeTools.map((name) => (
                <li key={name} className="rounded-md border border-line px-2 py-1 font-mono text-xs text-muted">
                  {name}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-semibold">Usage prices</h2>
            {[...grouped.entries()].map(([area, rows]) => (
              <div key={area} className="overflow-hidden rounded-2xl border border-line">
                <h3 className="bg-surface px-4 py-3 text-sm font-semibold">{AREA_LABELS[area]}</h3>
                <table className="w-full border-collapse text-left text-sm">
                  <caption className="sr-only">{AREA_LABELS[area]} prices</caption>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.tool} className="border-t border-line">
                        <th scope="row" className="w-1/2 p-4 font-mono font-medium">
                          {row.tool}
                        </th>
                        <td className="p-4 text-muted">{row.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <p className="text-sm text-faint">Data prices are estimates from provider cost. Ask your agent to call any tool with dry_run for the exact price first.</p>
          </div>
        </section>

        <section aria-labelledby="backlinks" className="mt-16 rounded-2xl border border-line p-6 sm:p-8">
          <h2 id="backlinks" className="text-2xl font-semibold">
            Backlinks and listicles
          </h2>
          <p className="mt-2 max-w-3xl text-muted">
            Two products, paid from the same Outrank backlink credits. A credit is <span className="font-mono text-ink">{money(creditUsd, 2)}</span>, taken from your credit or
            included usage. The price of a link follows the DR of the site it is on.
          </p>
          <ul className="mt-6 grid gap-4 md:hidden" aria-label="Backlink and listicle prices">
            {linkRows.map((row) => (
              <li key={row.id} className="rounded-2xl border border-line p-5">
                <p className="font-semibold">{row.name}</p>
                <p className="text-sm text-muted">{row.role}</p>
                <p className="mt-3 text-sm text-muted">
                  {row.what}
                  {row.maxLinksPerDay ? ` At most ${row.maxLinksPerDay} a day.` : ''}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-sm">
                  <div>
                    <dt className="text-muted">Per DR point</dt>
                    <dd className="font-mono font-semibold">{money(row.perDrUsd, 2)}</dd>
                    <dd className="text-muted">DR × {row.creditsPerDr} credits</dd>
                  </div>
                  <div>
                    <dt className="text-muted">DR {LINK_EXAMPLE_DR} example</dt>
                    <dd className="font-mono font-semibold">{money(row.example.usd)}</dd>
                    <dd className="text-muted">{row.example.credits} credits</dd>
                  </div>
                  <div>
                    <dt className="text-muted">DR {minDr}</dt>
                    <dd className="font-mono">{money(row.low.usd)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">DR {maxDr}</dt>
                    <dd className="font-mono">{money(row.high.usd)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-line md:block">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <caption className="sr-only">Backlink and listicle prices</caption>
              <thead className="bg-surface">
                <tr>
                  <th scope="col" className="p-4 font-semibold">
                    Product
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    What you get
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    Price per DR point
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    DR {LINK_EXAMPLE_DR} example
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    DR {minDr}
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    DR {maxDr}
                  </th>
                </tr>
              </thead>
              <tbody>
                {linkRows.map((row) => (
                  <tr key={row.id} className="border-t border-line align-top">
                    <th scope="row" className="p-4">
                      <span className="block font-semibold">{row.name}</span>
                      <span className="block text-sm font-normal whitespace-nowrap text-muted">{row.role}</span>
                    </th>
                    <td className="max-w-xs p-4 text-muted">
                      {row.what}
                      {row.maxLinksPerDay ? ` At most ${row.maxLinksPerDay} a day.` : ''}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="block font-mono font-semibold">{money(row.perDrUsd, 2)}</span>
                      <span className="block text-muted">DR × {row.creditsPerDr} credits</span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="block font-mono font-semibold">{money(row.example.usd)}</span>
                      <span className="block text-muted">{row.example.credits} credits</span>
                    </td>
                    <td className="p-4 font-mono whitespace-nowrap">{money(row.low.usd)}</td>
                    <td className="p-4 font-mono whitespace-nowrap">{money(row.high.usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-muted">
            <li>
              Your agent quotes an amount, shows you the total and adds the credits only after your yes. The smallest amount is {LINK_MIN_ALLOCATION_CREDITS} credits (
              {money(creditsToUsd(LINK_MIN_ALLOCATION_CREDITS, creditUsd))}).
            </li>
            <li>Each product has its own on/off switch and its own monthly credit budget, so you decide how the credits are split.</li>
            <li>
              The minimum DR ({minDr} to {maxDr}) and the target pages are shared by both. Outrank matching places links on real sites within those rules.
            </li>
            <li>Backlinks are placed at most {products.backlink.maxLinksPerDay ?? 2} a day. A listicle placement is always a list article.</li>
            <li>A link that is lost is refunded in credits.</li>
          </ul>
        </section>

        <section className="mt-6 flex flex-col gap-3 rounded-2xl bg-outrank-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-semibold">Already on Outrank? It is included.</h2>
            <p className="text-muted">
              A paid Outrank plan includes SEOforAgent with {money(pricing.outrankIncluded.includedUsd)} of usage a month and up to {pricing.outrankIncluded.projects} projects. Trials are not
              included.
            </p>
          </div>
          <Link href="/app" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-outrank px-6 font-semibold text-white hover:opacity-90">
            Sign in
          </Link>
        </section>

        <section aria-labelledby="faq" className="mt-16 max-w-3xl">
          <h2 id="faq" className="text-2xl font-semibold">
            Questions
          </h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-2">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {item.q}
                  <span aria-hidden="true" className="font-mono text-muted group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-3 text-muted">{item.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">
            Want SEO done for you instead?{' '}
            <a href={OUTRANK_URL} className="font-medium text-ink underline">
              Outrank
            </a>{' '}
            writes and publishes daily for $99 a month.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
};

export default PricingPage;
