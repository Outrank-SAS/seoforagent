import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CopyButton } from '@/components/CopyButton';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { CodeBlock } from '@/components/ui';
import { AGENT_PAGES, AGENT_PAGE_BY_SLUG } from '@/lib/agent-pages';
import { toolsByArea } from '@/lib/docs';
import { FALLBACK_PLANS } from '@/lib/pricing';
import { KEY_PLACEHOLDER, agentById, setupPrompt } from '@/lib/setup';
import { buttonPrimary, buttonSecondary } from '@/lib/styles';
import { AREA_LABELS, TOOLS } from '@/lib/tools';

export const dynamicParams = false;

export const generateStaticParams = () => AGENT_PAGES.map((page) => ({ agent: page.slug }));

type Props = { params: Promise<{ agent: string }> };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const page = AGENT_PAGE_BY_SLUG.get((await params).agent);
  if (!page) return {};
  return {
    title: page.h1,
    description: page.description,
    alternates: { canonical: `/for/${page.slug}` },
    openGraph: { title: `${page.h1} | SEOforAgent`, description: page.description, url: `/for/${page.slug}` },
  };
};

const SNIPPET_LABELS = { shell: 'Terminal', toml: '~/.codex/config.toml', json: '~/.cursor/mcp.json', text: 'Connector URL' } as const;

const StepNumber = ({ value }: { value: number }) => (
  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-white font-mono text-xs font-semibold text-ink">
    {value}
  </span>
);

const AgentPage = async ({ params }: Props) => {
  const page = AGENT_PAGE_BY_SLUG.get((await params).agent);
  const setup = page ? agentById(page.agentId) : undefined;
  if (!page || !setup) notFound();
  const priceFrom = Math.min(...FALLBACK_PLANS.map((plan) => plan.priceUsd));
  const others = AGENT_PAGES.filter((item) => item.slug !== page.slug);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex max-w-[860px] flex-col px-4 pt-14 sm:px-6 sm:pt-20">
        <p className="font-mono text-[13px] text-muted">
          <span aria-hidden="true" className="mr-2 text-accent">
            ❯
          </span>
          seoforagent for {page.label.toLowerCase()}
        </p>
        <h1 className="mt-4 text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-6xl">{page.h1}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-muted">{page.lede}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/#get-key" className={`${buttonPrimary} min-h-12`}>
            Get a key
            <span aria-hidden="true">→</span>
          </Link>
          <Link href="/docs" className={`${buttonSecondary} min-h-12`}>
            Read the docs
          </Link>
          <p className="text-sm text-muted">From ${priceFrom} a month, or credit once.</p>
        </div>

        <section aria-labelledby="connect" className="mt-20 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 id="connect" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Connect {page.label} in three steps
            </h2>
            <p className="text-muted">{page.connectNote}</p>
          </div>
          <ol className="flex flex-col gap-8 rounded-2xl border border-line bg-surface/70 p-5 sm:p-7">
            <li className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <StepNumber value={1} />
                <h3 className="text-[15px] font-semibold">Get a key</h3>
              </div>
              <p className="text-sm text-muted sm:pl-10">
                Open the{' '}
                <Link href="/#get-key" className="font-medium text-ink underline underline-offset-2">
                  homepage
                </Link>
                . A key is created in your browser. Activate it with a plan or one-time credit and it works the second Stripe confirms.
              </p>
            </li>
            <li className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <StepNumber value={2} />
                <h3 className="text-[15px] font-semibold">{setup.language === 'text' ? `Add the connector in ${setup.label}` : `Add SEOforAgent to ${setup.label}`}</h3>
              </div>
              <div className="flex min-w-0 flex-col gap-3 sm:pl-10">
                <p className="text-sm text-muted">{setup.intro}</p>
                <CodeBlock code={setup.snippet(KEY_PLACEHOLDER)} label={SNIPPET_LABELS[setup.language]} dark />
                {setup.steps.length > 1 ? (
                  <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-muted">
                    {setup.steps.slice(0, -1).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                ) : null}
                <p className="text-sm text-muted">
                  Replace <code className="font-mono text-ink">{KEY_PLACEHOLDER}</code> with your key. The homepage fills it in for you.
                </p>
              </div>
            </li>
            <li className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <StepNumber value={3} />
                <h3 className="text-[15px] font-semibold">Paste the setup prompt</h3>
              </div>
              <div className="flex min-w-0 flex-col gap-3 sm:pl-10">
                <CodeBlock code={setupPrompt()} label="Setup prompt" />
                <p className="text-sm text-muted">{setup.label} checks the key, asks for your website, and comes back with three things it can do and what each costs.</p>
              </div>
            </li>
          </ol>
        </section>

        <section aria-labelledby="prompts" className="mt-20 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 id="prompts" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Three things to ask {page.label}
            </h2>
            <p className="text-muted">Plain words in, tool calls out. Each answer says what it cost.</p>
          </div>
          <ul className="flex flex-col gap-4">
            {page.prompts.map((item) => (
              <li key={item.prompt} className="overflow-hidden rounded-2xl border border-line bg-white">
                <div className="flex flex-col gap-3 bg-ink p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <p className="font-mono text-[13px] leading-relaxed text-white">
                    <span aria-hidden="true" className="mr-2 text-accent">
                      ❯
                    </span>
                    {item.prompt}
                  </p>
                  <CopyButton text={item.prompt} variant="dark" className="self-start" />
                </div>
                <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <ul className="flex flex-wrap gap-1.5" aria-label="Tools used">
                    {item.tools.map((tool) => (
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
                  <p className="text-sm text-muted">{item.cost}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tools" className="mt-20 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 id="tools" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              The {TOOLS.length} tools {page.label} gets
            </h2>
            <p className="text-muted">
              Every tool returns what it found, what it cost and what to do next. Paid tools take <code className="font-mono text-ink">dry_run</code> to price a call first.
            </p>
          </div>
          <dl className="divide-y divide-line rounded-2xl border border-line bg-white">
            {toolsByArea().map(([area, tools]) => (
              <div key={area} className="grid gap-2 p-4 sm:grid-cols-[200px_1fr] sm:gap-4 sm:p-5">
                <dt className="text-sm font-medium text-ink">{AREA_LABELS[area]}</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {tools.map((tool) => (
                    <Link
                      key={tool.name}
                      href={`/docs#tool-${tool.name}`}
                      className="inline-flex min-h-8 items-center rounded-md border border-line px-2 font-mono text-xs text-muted transition-colors hover:border-ink/30 hover:text-ink"
                    >
                      {tool.name}
                    </Link>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-20 flex flex-col gap-5 rounded-2xl bg-ink p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-9">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Give {page.label} the data</h2>
            <p className="text-white/65">A key is created in your browser. Plans from ${priceFrom} a month, or credit once from $10.</p>
          </div>
          <Link href="/#get-key" className={`${buttonPrimary} min-h-12`}>
            Get a key
            <span aria-hidden="true">→</span>
          </Link>
        </section>

        <nav aria-label="Other agents" className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
          <span>Also for</span>
          {others.map((item) => (
            <Link key={item.slug} href={`/for/${item.slug}`} className="inline-flex min-h-10 items-center font-medium text-ink underline-offset-2 hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
      </main>
      <SiteFooter />
    </>
  );
};

export default AgentPage;
