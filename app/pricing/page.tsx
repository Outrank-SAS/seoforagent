import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { OUTRANK_URL } from '@/lib/config';
import { fetchPricing, linkPriceUsd } from '@/lib/pricing';
import { AREA_LABELS, TOOLS, TOOL_BY_NAME, type ToolArea } from '@/lib/tools';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'SEOforAgent plans from $9 a month with more usage included than they cost, one-time credit from $10 to $5,000, and backlinks at $0.80 per backlink credit.',
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
    q: 'Are repeated calls charged again?',
    a: 'The same call from the same account within 24 hours is free, unless the agent asks for fresh data.',
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
  const { creditUsd, creditsPerDr } = pricing.backlinks;

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
                    <td className="p-4">{plan.schedules ? 'Yes, coming soon' : 'No'}</td>
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
            <p className="text-sm text-muted">
              {freeTools.map((name, index) => (
                <span key={name}>
                  <code className="font-mono text-ink">{name}</code>
                  {index < freeTools.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
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
            Backlinks
          </h2>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            <div>
              <p className="font-mono text-3xl font-semibold">{money(creditUsd, 2)}</p>
              <p className="text-muted">per Outrank backlink credit, paid from your credit or included usage</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-semibold">DR × {creditsPerDr}</p>
              <p className="text-muted">credits per link, so {money(creditUsd * creditsPerDr, 2)} per DR point</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-semibold">{money(linkPriceUsd(50))}</p>
              <p className="text-muted">for a DR 50 link (200 credits). DR 30 is {money(linkPriceUsd(30))}, DR 70 is {money(linkPriceUsd(70))}.</p>
            </div>
          </div>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-muted">
            <li>Your agent quotes an amount, shows you the total and allocates it only after your yes.</li>
            <li>You set a monthly budget, a minimum DR, target pages and whether to prefer listicles. Outrank matching places links on real sites within those rules.</li>
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
